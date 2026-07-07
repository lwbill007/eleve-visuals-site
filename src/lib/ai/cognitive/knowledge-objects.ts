import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import type { MemoryRecord } from "../memory/types";
import type { KnowledgeObject, KnowledgeObjectType } from "./types";

const CATEGORY_TO_TYPE: Record<string, KnowledgeObjectType> = {
  client: "client",
  lead: "lead",
  campaign: "campaign",
  booking: "booking",
  project: "project",
  portfolio: "portfolio",
  page: "page",
  package: "package",
  service: "service",
  workflow: "workflow",
  automation: "automation",
  conversation: "conversation",
  decision: "decision",
  prediction: "prediction",
  lesson: "lesson",
  experiment: "experiment",
  opportunity: "opportunity",
  risk: "risk",
  revenue: "revenue_event",
  revenue_event: "revenue_event",
  marketing_asset: "marketing_asset",
  sponsor: "sponsor",
  session: "session",
  volume: "volume",
  photographer: "photographer",
  model: "model",
  location: "location",
  equipment: "equipment",
  invoice: "invoice",
  task: "task",
  review: "review",
  email: "email",
  form: "form",
  brand_identity: "marketing_asset",
  page_intel: "page",
  crm_contact: "client",
  pipeline: "lead",
  mission_outcome: "lesson",
  refresh_report: "experiment",
};

const LAYER_DEFAULT_TYPE: Record<string, KnowledgeObjectType> = {
  crm: "client",
  creative: "portfolio",
  marketing: "campaign",
  financial: "revenue_event",
  sessions: "volume",
  sponsor: "sponsor",
  business: "decision",
  brand: "marketing_asset",
  operational: "workflow",
};

function inferType(record: MemoryRecord): KnowledgeObjectType {
  const cat = record.category.toLowerCase();
  if (CATEGORY_TO_TYPE[cat]) return CATEGORY_TO_TYPE[cat];
  for (const [key, type] of Object.entries(CATEGORY_TO_TYPE)) {
    if (cat.includes(key)) return type;
  }
  return LAYER_DEFAULT_TYPE[record.layer] ?? "lesson";
}

function inferBusinessImpact(record: MemoryRecord, type: KnowledgeObjectType): string {
  if (record.importance >= 85) return "High — directly affects revenue or brand decisions";
  if (type === "booking" || type === "lead" || type === "revenue_event") return "Revenue pipeline impact";
  if (type === "page" || type === "portfolio") return "Conversion and brand perception";
  if (type === "lesson" || type === "experiment") return "Strengthens future recommendations";
  if (record.importance >= 60) return "Moderate — informs operational decisions";
  return "Contextual — supports understanding";
}

export async function buildKnowledgeObjects(limit = 80): Promise<{
  objects: KnowledgeObject[];
  counts: Record<KnowledgeObjectType, number>;
}> {
  const workspaceId = getWorkspaceId();

  const [memories, relationCounts] = await Promise.all([
    prisma.aIMemory.findMany({
      where: { workspaceId, archived: false },
      orderBy: [{ pinned: "desc" }, { importance: "desc" }, { updatedAt: "desc" }],
      take: limit,
    }),
    prisma.aIMemoryRelation.groupBy({
      by: ["fromMemoryId"],
      where: { workspaceId },
      _count: { fromMemoryId: true },
    }),
  ]);

  const relMap = new Map(relationCounts.map((r) => [r.fromMemoryId, r._count.fromMemoryId]));

  const counts = {} as Record<KnowledgeObjectType, number>;
  const allTypes: KnowledgeObjectType[] = [
    "client", "lead", "campaign", "booking", "project", "portfolio", "page", "package",
    "service", "workflow", "automation", "conversation", "decision", "prediction",
    "lesson", "experiment", "opportunity", "risk", "revenue_event", "marketing_asset",
    "sponsor", "session", "volume", "photographer", "model", "location", "equipment",
    "invoice", "task", "review", "email", "form",
  ];
  for (const t of allTypes) counts[t] = 0;

  const objects: KnowledgeObject[] = memories.map((row) => {
    const record: MemoryRecord = {
      id: row.id,
      workspaceId: row.workspaceId,
      layer: row.layer as MemoryRecord["layer"],
      category: row.category,
      key: row.key,
      title: row.title,
      summary: row.summary,
      value: {},
      confidence: row.confidence,
      importance: row.importance,
      source: row.source as MemoryRecord["source"],
      sourceRef: row.sourceRef,
      verified: row.verified,
      pinned: row.pinned,
      archived: row.archived,
      tags: [],
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };

    const type = inferType(record);
    counts[type] = (counts[type] ?? 0) + 1;

    let evidence: string[] = [];
    try {
      const val = JSON.parse(row.value || "{}") as Record<string, unknown>;
      if (Array.isArray(val.evidence)) evidence = val.evidence.map(String);
      else if (val.sourcePage) evidence = [String(val.sourcePage)];
      else if (row.sourceRef) evidence = [row.sourceRef];
    } catch {
      if (row.sourceRef) evidence = [row.sourceRef];
    }

    return {
      id: `obj-${row.id}`,
      type,
      title: row.title || row.key,
      summary: row.summary,
      layer: record.layer,
      category: row.category,
      confidence: row.confidence,
      importance: row.importance,
      businessImpact: inferBusinessImpact(record, type),
      evidence,
      owner: row.source === "user" ? "admin" : row.source,
      lifecycle: row.archived ? "archived" : "active",
      status: row.verified ? "verified" : row.pinned ? "pinned" : "active",
      tags: [],
      verified: row.verified,
      version: 1,
      relationshipCount: relMap.get(row.id) ?? 0,
      updatedAt: row.updatedAt.toISOString(),
      memoryId: row.id,
    };
  });

  const typeCounts = await prisma.aIMemory.groupBy({
    by: ["layer", "category"],
    where: { workspaceId, archived: false },
    _count: { id: true },
  });

  for (const g of typeCounts) {
    const fakeRecord = {
      layer: g.layer,
      category: g.category,
      importance: 50,
    } as MemoryRecord;
    const t = inferType(fakeRecord);
    counts[t] = (counts[t] ?? 0) + g._count.id;
  }

  return { objects, counts };
}
