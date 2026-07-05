import { prisma } from "@/lib/db";
import type { MemoryGraph } from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";

export async function linkMemories(
  fromMemoryId: string,
  toMemoryId: string,
  relationType: string,
  weight = 1,
  metadata: Record<string, unknown> = {},
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  return prisma.aIMemoryRelation.upsert({
    where: {
      fromMemoryId_toMemoryId_relationType: { fromMemoryId, toMemoryId, relationType },
    },
    create: {
      workspaceId,
      fromMemoryId,
      toMemoryId,
      relationType,
      weight,
      metadata: JSON.stringify(metadata),
    },
    update: { weight, metadata: JSON.stringify(metadata) },
  });
}

export async function getMemoryGraph(options?: {
  workspaceId?: string;
  layer?: string;
  limit?: number;
}): Promise<MemoryGraph> {
  const workspaceId = options?.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const limit = options?.limit ?? 60;

  const memories = await prisma.aIMemory.findMany({
    where: {
      workspaceId,
      archived: false,
      ...(options?.layer ? { layer: options.layer } : {}),
    },
    orderBy: [{ pinned: "desc" }, { importance: "desc" }],
    take: limit,
    select: { id: true, title: true, key: true, layer: true, category: true },
  });

  const ids = new Set(memories.map((m) => m.id));
  const relations = await prisma.aIMemoryRelation.findMany({
    where: {
      workspaceId,
      OR: [{ fromMemoryId: { in: [...ids] } }, { toMemoryId: { in: [...ids] } }],
    },
    take: limit * 2,
  });

  return {
    nodes: memories.map((m) => ({
      id: m.id,
      label: m.title || m.key,
      layer: m.layer as MemoryGraph["nodes"][number]["layer"],
      category: m.category,
    })),
    edges: relations
      .filter((r) => ids.has(r.fromMemoryId) && ids.has(r.toMemoryId))
      .map((r) => ({
        id: r.id,
        from: r.fromMemoryId,
        to: r.toMemoryId,
        relationType: r.relationType,
        weight: r.weight,
      })),
  };
}
