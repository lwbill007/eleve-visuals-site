import { prisma } from "@/lib/db";
import { linkMemories } from "../memory/graph";
import { getMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { computeGraphHealth } from "../truth/integrations";
import type { KnowledgeGraphStats } from "./types";

export async function strengthenKnowledgeGraph(): Promise<KnowledgeGraphStats> {
  const workspaceId = getWorkspaceId();
  const cache = new Map<string, string>();

  async function memId(layer: string, category: string, key: string) {
    const fp = `${layer}:${category}:${key}`;
    if (cache.has(fp)) return cache.get(fp)!;
    const m = await getMemory(layer as Parameters<typeof getMemory>[0], category, key, workspaceId);
    if (m) cache.set(fp, m.id);
    return m?.id;
  }

  const crm = await getAdminCRMContacts();
  const links: string[] = [];

  const bookingMem = await memId("business", "page", "booking");
  const pipelineMem = await memId("financial", "pipeline", "pipeline-live");
  const portfolioMem = await memId("creative", "page", "portfolio-index");

  for (const contact of crm.slice(0, 25)) {
    const clientKey = `client-${contact.email.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
    const { writeMemory } = await import("../memory/store");

    const mem = await writeMemory({
      workspaceId,
      layer: "crm",
      category: "client",
      key: clientKey,
      title: contact.name || contact.email,
      summary: `${contact.bookings} bookings · $${contact.revenue} revenue · ${contact.status}`,
      value: {
        email: contact.email,
        bookings: contact.bookings,
        revenue: contact.revenue,
        status: contact.status,
        lastActivity: contact.lastActivity,
      },
      confidence: 0.9,
      importance: contact.revenue > 1000 ? 85 : 65,
      source: "sync",
      sourceRef: `crm:${contact.email}`,
      tags: ["executive-os", "client", "knowledge-graph", ...(contact.tags ?? [])],
      actor: "graph-builder",
      reason: "Client node in living knowledge graph",
    });

    cache.set(`crm:client:${clientKey}`, mem.id);

    if (bookingMem) {
      await linkMemories(mem.id, bookingMem, contact.bookings > 0 ? "booked_via" : "prospect_for", 1, {
        email: contact.email,
      }).catch(() => {});
      links.push(`${contact.name} → Booking`);
    }
    if (pipelineMem && contact.revenue > 0) {
      await linkMemories(mem.id, pipelineMem, "contributed_revenue", contact.revenue / 1000, {
        revenue: contact.revenue,
      }).catch(() => {});
    }
    if (portfolioMem) {
      await linkMemories(mem.id, portfolioMem, "viewed_work", 0.5).catch(() => {});
    }
  }

  const homeMem = await memId("brand", "page", "home");
  const sessionsMem = await memId("sessions", "page", "sessions-index");
  const bookMem = bookingMem;

  if (homeMem && portfolioMem) {
    await linkMemories(homeMem, portfolioMem, "navigates_to", 1).catch(() => {});
    links.push("Homepage → Portfolio");
  }
  if (portfolioMem && bookMem) {
    await linkMemories(portfolioMem, bookMem, "converts_to", 0.8).catch(() => {});
    links.push("Portfolio → Booking");
  }
  if (sessionsMem && bookMem) {
    await linkMemories(sessionsMem, bookMem, "related_funnel", 0.6).catch(() => {});
  }

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, type: true, contactEmail: true, data: true, createdAt: true },
  });

  for (const sub of submissions) {
    let contactName = sub.contactEmail;
    try {
      const parsed = JSON.parse(sub.data || "{}") as { name?: string };
      if (parsed.name) contactName = parsed.name;
    } catch {
      /* use email */
    }
    const subKey = `submission-${sub.id}`;
    const { writeMemory } = await import("../memory/store");
    const subMem = await writeMemory({
      workspaceId,
      layer: sub.type === "booking" ? "crm" : "sessions",
      category: sub.type === "booking" ? "lead" : "application",
      key: subKey,
      title: `${sub.type}: ${contactName}`,
      summary: `Inquiry from ${sub.contactEmail}`,
      value: { submissionId: sub.id, type: sub.type, email: sub.contactEmail },
      confidence: 0.92,
      importance: 70,
      source: "sync",
      sourceRef: `submission:${sub.id}`,
      tags: ["graph", "submission", sub.type],
      actor: "graph-builder",
      reason: "Submission linked in knowledge graph",
    });

    if (bookMem && sub.type === "booking") {
      await linkMemories(subMem.id, bookMem, "submitted_via", 1, { submissionId: sub.id }).catch(() => {});
      links.push(`Inquiry ${contactName} → Booking`);
    }
    if (portfolioMem) {
      await linkMemories(subMem.id, portfolioMem, "discovered_via", 0.7).catch(() => {});
    }
    const clientId = cache.get(`crm:client:client-${sub.contactEmail.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`);
    if (clientId) {
      await linkMemories(clientId, subMem.id, "generated", 1).catch(() => {});
    }
  }

  const volumes = await prisma.sessionVolume.findMany({
    where: { published: true },
    take: 10,
    select: { id: true, title: true, volumeNumber: true },
  });

  for (const vol of volumes) {
    const volKey = `volume-${vol.id}`;
    const { writeMemory } = await import("../memory/store");
    const volMem = await writeMemory({
      workspaceId,
      layer: "sessions",
      category: "volume",
      key: volKey,
      title: `Volume ${vol.volumeNumber}: ${vol.title}`,
      summary: "ÉLEVÉ Sessions volume",
      value: { volumeId: vol.id },
      confidence: 0.9,
      importance: 75,
      source: "sync",
      sourceRef: `volume:${vol.id}`,
      tags: ["graph", "sessions"],
      actor: "graph-builder",
      reason: "Volume node in knowledge graph",
    });
    if (sessionsMem) {
      await linkMemories(sessionsMem, volMem.id, "features", 1).catch(() => {});
      links.push(`Sessions → Volume ${vol.volumeNumber}`);
    }
  }

  const analyticsTop = await prisma.analyticsEvent.groupBy({
    by: ["path"],
    where: { type: "pageview", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 15,
  });

  for (const row of analyticsTop) {
    const pathKey = row.path.replace(/[^a-z0-9]/gi, "-").slice(0, 80);
    const pageMem = await memId("marketing", "page_intel", pathKey);
    if (pageMem && homeMem && row.path !== "/") {
      await linkMemories(homeMem, pageMem, "traffic_flow", row._count.id / 100, { views: row._count.id }).catch(
        () => {}
      );
    }
  }

  const [nodeCount, edgeCount, layerGroups] = await Promise.all([
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
    prisma.aIMemoryRelation.count({ where: { workspaceId } }),
    prisma.aIMemory.groupBy({
      by: ["layer"],
      where: { workspaceId, archived: false },
      _count: { id: true },
    }),
  ]);

  const layers: Record<string, number> = {};
  for (const g of layerGroups) layers[g.layer] = g._count.id;

  const graphHealth = computeGraphHealth(nodeCount, edgeCount);

  return {
    nodes: nodeCount,
    edges: edgeCount,
    layers,
    recentLinks: links.slice(0, 12),
    graphHealth,
  };
}

export async function getKnowledgeGraphStats(): Promise<KnowledgeGraphStats> {
  const workspaceId = getWorkspaceId();
  const [nodeCount, edgeCount, layerGroups] = await Promise.all([
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
    prisma.aIMemoryRelation.count({ where: { workspaceId } }),
    prisma.aIMemory.groupBy({
      by: ["layer"],
      where: { workspaceId, archived: false },
      _count: { id: true },
    }),
  ]);

  const layers: Record<string, number> = {};
  for (const g of layerGroups) layers[g.layer] = g._count.id;

  const { items } = await searchMemories({ workspaceId, limit: 1 });
  void items;

  return { nodes: nodeCount, edges: edgeCount, layers, recentLinks: [] };
}
