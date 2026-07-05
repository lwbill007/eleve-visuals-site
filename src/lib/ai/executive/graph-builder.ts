import { prisma } from "@/lib/db";
import { linkMemories } from "../memory/graph";
import { getMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { getAdminCRMContacts } from "@/lib/admin-os-server";
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

  return {
    nodes: nodeCount,
    edges: edgeCount,
    layers,
    recentLinks: links.slice(0, 8),
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
