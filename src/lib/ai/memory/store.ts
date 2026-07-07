import { prisma } from "@/lib/db";
import {
  DEFAULT_WORKSPACE_ID,
  MEMORY_LAYERS,
  type MemoryLayer,
  type MemoryRecord,
  type MemorySearchFilters,
  type MemoryWriteInput,
} from "./types";
import { parseJsonArray, parseJsonObject, resolveLayer } from "./utils";

function mapRow(row: {
  id: string;
  workspaceId: string;
  layer: string;
  category: string;
  key: string;
  title: string;
  summary: string;
  value: string;
  confidence: number;
  importance: number;
  source: string;
  sourceRef: string;
  verified: boolean;
  verificationStatus?: string;
  pinned: boolean;
  archived: boolean;
  tags: string;
  updatedAt: Date;
  createdAt: Date;
}): MemoryRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    layer: row.layer as MemoryRecord["layer"],
    category: row.category,
    key: row.key,
    title: row.title,
    summary: row.summary,
    value: parseJsonObject(row.value),
    confidence: row.confidence,
    importance: row.importance,
    source: row.source as MemoryRecord["source"],
    sourceRef: row.sourceRef,
    verified: row.verified,
    verificationStatus: row.verificationStatus as MemoryRecord["verificationStatus"],
    pinned: row.pinned,
    archived: row.archived,
    tags: parseJsonArray(row.tags),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

async function auditMemory(
  memoryId: string,
  action: string,
  before: MemoryRecord | null,
  after: MemoryRecord | null,
  actor = "system",
  reason = ""
) {
  await prisma.aIMemoryAudit.create({
    data: {
      memoryId,
      action,
      before: JSON.stringify(before ?? {}),
      after: JSON.stringify(after ?? {}),
      actor,
      reason,
    },
  });
}

export async function writeMemory(input: MemoryWriteInput): Promise<MemoryRecord> {
  const workspaceId = input.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const layer = resolveLayer(input.category, input.layer);

  const existing = await prisma.aIMemory.findUnique({
    where: {
      workspaceId_layer_category_key: {
        workspaceId,
        layer,
        category: input.category,
        key: input.key,
      },
    },
  });

  const verificationStatus =
    input.archived
      ? "archived"
      : input.verified || input.pinned
        ? input.pinned
          ? "trusted"
          : "verified"
        : input.source === "sync" &&
            (input.sourceRef?.startsWith("crm:") ||
              input.sourceRef?.startsWith("submission:") ||
              input.category === "client")
          ? "verified"
          : "pending";

  const data = {
    workspaceId,
    layer,
    category: input.category,
    key: input.key,
    title: input.title ?? input.key,
    summary: input.summary ?? "",
    value: JSON.stringify(input.value),
    confidence: input.confidence ?? 0.7,
    importance: input.importance ?? 50,
    source: input.source ?? "system",
    sourceRef: input.sourceRef ?? "",
    verified: input.verified ?? (verificationStatus === "verified" || verificationStatus === "trusted"),
    verificationStatus,
    verifiedAt:
      verificationStatus === "verified" || verificationStatus === "trusted" ? new Date() : null,
    verifiedBy:
      verificationStatus === "verified" || verificationStatus === "trusted"
        ? input.actor ?? "system"
        : "",
    pinned: input.pinned ?? false,
    archived: input.archived ?? false,
    tags: JSON.stringify(input.tags ?? []),
  };

  const row = existing
    ? await prisma.aIMemory.update({ where: { id: existing.id }, data })
    : await prisma.aIMemory.create({ data });

  const record = mapRow(row);
  await auditMemory(
    record.id,
    existing ? "update" : "create",
    existing ? mapRow(existing) : null,
    record,
    input.actor ?? input.source ?? "system",
    input.reason ?? ""
  );

  const { indexMemoryEmbeddingBackground } = await import("./embeddings");
  indexMemoryEmbeddingBackground(record);

  return record;
}

export async function getMemoryById(id: string): Promise<MemoryRecord | null> {
  const row = await prisma.aIMemory.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function getMemory(
  layer: MemoryWriteInput["layer"],
  category: string,
  key: string,
  workspaceId = DEFAULT_WORKSPACE_ID
): Promise<MemoryRecord | null> {
  const row = await prisma.aIMemory.findUnique({
    where: {
      workspaceId_layer_category_key: { workspaceId, layer, category, key },
    },
  });
  return row ? mapRow(row) : null;
}

export async function searchMemories(filters: MemorySearchFilters = {}): Promise<{
  items: MemoryRecord[];
  total: number;
}> {
  const workspaceId = filters.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const layers = filters.layer
    ? Array.isArray(filters.layer)
      ? filters.layer
      : [filters.layer]
    : undefined;

  const where = {
    workspaceId,
    archived: filters.archived ?? false,
    ...(layers ? { layer: { in: layers } } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.pinned !== undefined ? { pinned: filters.pinned } : {}),
    ...(filters.verified !== undefined ? { verified: filters.verified } : {}),
    ...(filters.source ? { source: filters.source } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.aIMemory.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { importance: "desc" }, { updatedAt: "desc" }],
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.aIMemory.count({ where }),
  ]);

  let items = rows.map(mapRow);

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    items = items.filter((m) =>
      [m.title, m.summary, m.category, m.key, m.tags.join(" "), JSON.stringify(m.value)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return { items, total: filters.query ? items.length : total };
}

export async function updateMemoryFlags(
  id: string,
  flags: Partial<Pick<MemoryRecord, "pinned" | "archived" | "verified">>,
  actor = "user",
  reason = ""
): Promise<MemoryRecord | null> {
  const before = await getMemoryById(id);
  if (!before) return null;

  const row = await prisma.aIMemory.update({
    where: { id },
    data: {
      pinned: flags.pinned ?? before.pinned,
      archived: flags.archived ?? before.archived,
      verified: flags.verified ?? before.verified,
    },
  });

  const after = mapRow(row);
  await auditMemory(id, flags.archived ? "archive" : flags.pinned !== undefined ? "pin" : "verify", before, after, actor, reason);
  return after;
}

export async function correctMemory(
  id: string,
  patch: Partial<Pick<MemoryWriteInput, "title" | "summary" | "value" | "confidence" | "importance" | "tags">>,
  actor = "user",
  reason = "User correction"
): Promise<MemoryRecord | null> {
  const before = await getMemoryById(id);
  if (!before) return null;

  const row = await prisma.aIMemory.update({
    where: { id },
    data: {
      title: patch.title ?? before.title,
      summary: patch.summary ?? before.summary,
      value: JSON.stringify(patch.value ?? before.value),
      confidence: patch.confidence ?? before.confidence,
      importance: patch.importance ?? before.importance,
      tags: JSON.stringify(patch.tags ?? before.tags),
      source: "user",
      verified: true,
    },
  });

  const after = mapRow(row);
  await auditMemory(id, "correct", before, after, actor, reason);
  return after;
}

export async function deleteMemory(id: string, actor = "user", reason = ""): Promise<boolean> {
  const before = await getMemoryById(id);
  if (!before) return false;

  await auditMemory(id, "delete", before, null, actor, reason);
  await prisma.aIMemory.delete({ where: { id } });
  return true;
}

export async function getMemoryTimeline(limit = 40, workspaceId = DEFAULT_WORKSPACE_ID) {
  const rows = await prisma.aIMemory.findMany({
    where: { workspaceId, archived: false },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(mapRow);
}

export async function getMemoryStats(workspaceId = DEFAULT_WORKSPACE_ID) {
  const grouped = await prisma.aIMemory.groupBy({
    by: ["layer"],
    where: { workspaceId, archived: false },
    _count: { id: true },
  });

  const pinned = await prisma.aIMemory.count({ where: { workspaceId, pinned: true, archived: false } });
  const verified = await prisma.aIMemory.count({ where: { workspaceId, verified: true, archived: false } });
  const total = grouped.reduce((s, g) => s + g._count.id, 0);

  return {
    total,
    pinned,
    verified,
    byLayer: Object.fromEntries(grouped.map((g) => [g.layer, g._count.id])),
  };
}

export async function getMemoryHeatmap(workspaceId = DEFAULT_WORKSPACE_ID, weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * 86400000);
  const rows = await prisma.aIMemory.findMany({
    where: { workspaceId, archived: false, updatedAt: { gte: since } },
    select: { layer: true, updatedAt: true, importance: true },
  });

  const weekLabels: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    weekLabels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }

  const grid: Record<string, number[]> = {};
  for (const layer of MEMORY_LAYERS) {
    grid[layer.id] = Array.from({ length: weeks }, () => 0);
  }

  for (const row of rows) {
    const ageMs = Date.now() - row.updatedAt.getTime();
    const weekIndex = weeks - 1 - Math.min(weeks - 1, Math.floor(ageMs / (7 * 86400000)));
    if (grid[row.layer]) {
      grid[row.layer][weekIndex] += Math.max(1, Math.round(row.importance / 20));
    }
  }

  return {
    weeks: weekLabels,
    layers: MEMORY_LAYERS.map((l) => ({ id: l.id, label: l.label })),
    values: grid as Record<MemoryLayer, number[]>,
    max: Math.max(1, ...Object.values(grid).flatMap((v) => v)),
  };
}

export async function getMemoryAudits(memoryId: string, limit = 20) {
  const rows = await prisma.aIMemoryAudit.findMany({
    where: { memoryId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actor: r.actor,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }));
}
