import { prisma } from "@/lib/db";
import { cosineSimilarity, embedText, embedTexts } from "../embeddings/client";
import type { MemoryRecord } from "./types";
import { memorySearchText } from "./utils";
import { DEFAULT_WORKSPACE_ID } from "./types";
import { getWorkspaceId } from "./workspace";

const CHUNK_SIZE = 900;

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= CHUNK_SIZE) return [trimmed];
  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    chunks.push(trimmed.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE;
  }
  return chunks;
}

function memoryToChunks(memory: MemoryRecord): { chunkKey: string; text: string }[] {
  const base = `${memory.title}\n${memory.summary}\n${memorySearchText(memory)}`;
  return chunkText(base).map((text, i) => ({
    chunkKey: `${memory.id}:${i}`,
    text,
  }));
}

export async function indexMemoryEmbedding(memory: MemoryRecord): Promise<number> {
  const workspaceId = memory.workspaceId ?? getWorkspaceId();
  const chunks = memoryToChunks(memory);
  if (chunks.length === 0) return 0;

  const vectors = await embedTexts(chunks.map((c) => c.text));
  let indexed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const { chunkKey, text } = chunks[i];
    const embedding = JSON.stringify(vectors[i] ?? []);
    await prisma.aIMemoryEmbedding.upsert({
      where: { workspaceId_chunkKey: { workspaceId, chunkKey } },
      create: {
        workspaceId,
        memoryId: memory.id,
        chunkKey,
        text,
        embedding,
        layer: memory.layer,
        category: memory.category,
        sourcePage: memory.sourceRef || "",
      },
      update: {
        memoryId: memory.id,
        text,
        embedding,
        layer: memory.layer,
        category: memory.category,
        sourcePage: memory.sourceRef || "",
      },
    });
    indexed += 1;
  }

  return indexed;
}

export function indexMemoryEmbeddingBackground(memory: MemoryRecord): void {
  void indexMemoryEmbedding(memory).catch(() => {});
}

export async function indexFindingEmbedding(input: {
  chunkKey: string;
  text: string;
  layer: string;
  category: string;
  sourcePage?: string;
  memoryId?: string;
}): Promise<void> {
  const workspaceId = getWorkspaceId();
  const vector = await embedText(input.text);
  await prisma.aIMemoryEmbedding.upsert({
    where: { workspaceId_chunkKey: { workspaceId, chunkKey: input.chunkKey } },
    create: {
      workspaceId,
      memoryId: input.memoryId ?? null,
      chunkKey: input.chunkKey,
      text: input.text,
      embedding: JSON.stringify(vector),
      layer: input.layer,
      category: input.category,
      sourcePage: input.sourcePage ?? "",
    },
    update: {
      text: input.text,
      embedding: JSON.stringify(vector),
      layer: input.layer,
      category: input.category,
      sourcePage: input.sourcePage ?? "",
    },
  });
}

export async function reindexAllMemoryEmbeddings(limit = 500): Promise<{ indexed: number; chunks: number }> {
  const workspaceId = getWorkspaceId();
  const memories = await prisma.aIMemory.findMany({
    where: { workspaceId, archived: false },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let chunks = 0;
  for (const row of memories) {
    const memory: MemoryRecord = {
      id: row.id,
      workspaceId: row.workspaceId,
      layer: row.layer as MemoryRecord["layer"],
      category: row.category,
      key: row.key,
      title: row.title,
      summary: row.summary,
      value: JSON.parse(row.value || "{}") as Record<string, unknown>,
      confidence: row.confidence,
      importance: row.importance,
      source: row.source as MemoryRecord["source"],
      sourceRef: row.sourceRef,
      verified: row.verified,
      pinned: row.pinned,
      archived: row.archived,
      tags: JSON.parse(row.tags || "[]") as string[],
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
    chunks += await indexMemoryEmbedding(memory);
  }

  return { indexed: memories.length, chunks };
}

export interface SemanticSearchHit {
  chunkKey: string;
  memoryId: string | null;
  text: string;
  layer: string;
  category: string;
  sourcePage: string;
  score: number;
}

export async function semanticSearchMemories(
  query: string,
  options?: { layers?: string[]; limit?: number }
): Promise<SemanticSearchHit[]> {
  const workspaceId = getWorkspaceId();
  const limit = options?.limit ?? 12;
  const queryVec = await embedText(query);

  const rows = await prisma.aIMemoryEmbedding.findMany({
    where: {
      workspaceId,
      ...(options?.layers?.length ? { layer: { in: options.layers } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(800, limit * 40),
  });

  const scored: SemanticSearchHit[] = [];
  for (const row of rows) {
    let vec: number[] = [];
    try {
      vec = JSON.parse(row.embedding) as number[];
    } catch {
      continue;
    }
    const score = cosineSimilarity(queryVec, vec);
    if (score < 0.12) continue;
    scored.push({
      chunkKey: row.chunkKey,
      memoryId: row.memoryId,
      text: row.text,
      layer: row.layer,
      category: row.category,
      sourcePage: row.sourcePage,
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function getEmbeddingStats(): Promise<{
  chunks: number;
  memories: number;
  mode: "api" | "local";
}> {
  const workspaceId = DEFAULT_WORKSPACE_ID;
  const [chunks, memories] = await Promise.all([
    prisma.aIMemoryEmbedding.count({ where: { workspaceId } }),
    prisma.aIMemoryEmbedding.groupBy({
      by: ["memoryId"],
      where: { workspaceId, memoryId: { not: null } },
    }),
  ]);
  const { isEmbeddingConfigured } = await import("../embeddings/client");
  return {
    chunks,
    memories: memories.length,
    mode: isEmbeddingConfigured() ? "api" : "local",
  };
}
