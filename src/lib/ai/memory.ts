import { prisma } from "@/lib/db";
import {
  buildRAGContext,
  correctMemory,
  deleteMemory,
  getMemory,
  getMemoryAudits,
  getMemoryStats,
  getMemoryTimeline,
  searchMemories,
  syncAllMemories,
  updateMemoryFlags,
  writeMemory,
  type MemoryLayer,
  type MemoryWriteInput,
} from "./memory/index";
import { LEGACY_CATEGORY_TO_LAYER } from "./memory/types";

/** @deprecated Use writeMemory from ./memory — kept for backward compatibility */
export async function getAIMemory(category: string, key: string): Promise<Record<string, unknown> | null> {
  const layer = LEGACY_CATEGORY_TO_LAYER[category] ?? "operational";
  const record = await getMemory(layer, category, key);
  return record?.value ?? null;
}

/** @deprecated Use writeMemory from ./memory */
export async function setAIMemory(
  category: string,
  key: string,
  value: Record<string, unknown>,
  opts?: Partial<MemoryWriteInput>
): Promise<void> {
  const layer = opts?.layer ?? LEGACY_CATEGORY_TO_LAYER[category] ?? "operational";
  await writeMemory({
    layer,
    category,
    key,
    value,
    title: opts?.title ?? key,
    summary: opts?.summary,
    ...opts,
  });
}

export async function getAIMemoriesByCategory(
  category: string,
  limit = 50
): Promise<{ key: string; value: Record<string, unknown> }[]> {
  const layer = LEGACY_CATEGORY_TO_LAYER[category] ?? "operational";
  const { items } = await searchMemories({ layer, category, limit });
  return items.map((m) => ({ key: m.key, value: m.value }));
}

export async function appendConversationMessage(
  page: string,
  context: Record<string, unknown>,
  message: { role: string; content: string }
): Promise<void> {
  const existing = await prisma.aIConversation.findFirst({
    where: { page },
    orderBy: { updatedAt: "desc" },
  });

  const messages = existing
    ? (() => {
        try {
          return JSON.parse(existing.messages) as { role: string; content: string }[];
        } catch {
          return [];
        }
      })()
    : [];

  messages.push(message);
  const trimmed = messages.slice(-40);

  if (existing) {
    await prisma.aIConversation.update({
      where: { id: existing.id },
      data: {
        context: JSON.stringify(context),
        messages: JSON.stringify(trimmed),
      },
    });
  } else {
    await prisma.aIConversation.create({
      data: {
        page,
        context: JSON.stringify(context),
        messages: JSON.stringify(trimmed),
      },
    });
  }
}

export async function getConversationHistory(page: string): Promise<{ role: string; content: string }[]> {
  const row = await prisma.aIConversation.findFirst({
    where: { page },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return [];
  try {
    return JSON.parse(row.messages) as { role: string; content: string }[];
  } catch {
    return [];
  }
}

/** Structured business knowledge for AI context (RAG + recent memories) */
export async function buildMemoryContext(query?: string, page?: string): Promise<string> {
  if (query) {
    return buildRAGContext(query, page);
  }

  const { buildCognitiveContextForPrompt } = await import("./cognitive/context-prompt");
  const [cognitive, { items }] = await Promise.all([
    buildCognitiveContextForPrompt(page),
    searchMemories({ limit: 12, archived: false }),
  ]);

  if (items.length === 0) {
    return `${cognitive}\n\nNo structured memories yet. Run Refresh Executive Intelligence from Knowledge Engine (/admin/memory).`;
  }

  const memories = items
    .map(
      (m) =>
        `[${m.layer}/${m.category}] ${m.title}: ${m.summary || JSON.stringify(m.value).slice(0, 200)} (confidence ${Math.round(m.confidence * 100)}%)`
    )
    .join("\n");

  return `${cognitive}\n\nRECENT MEMORIES:\n${memories}`;
}

export {
  buildRAGContext,
  correctMemory,
  deleteMemory,
  getMemoryAudits,
  getMemoryStats,
  getMemoryTimeline,
  searchMemories,
  syncAllMemories,
  updateMemoryFlags,
  writeMemory,
  type MemoryLayer,
  type MemoryWriteInput,
};
