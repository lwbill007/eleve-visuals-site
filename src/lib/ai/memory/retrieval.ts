import type { MemoryLayer, MemoryCitation, RetrievedMemory } from "./types";
import { getLearningSummaryForPrompt } from "./learning";
import { searchMemories } from "./store";
import { memorySearchText } from "./utils";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function scoreMemory(
  memory: Awaited<ReturnType<typeof searchMemories>>["items"][number],
  queryTokens: string[],
  layerBoost: Set<MemoryLayer>
): RetrievedMemory {
  const text = memorySearchText(memory);
  const reasons: string[] = [];
  let score = memory.importance * 0.3 + memory.confidence * 20;

  if (memory.pinned) {
    score += 25;
    reasons.push("Pinned memory");
  }
  if (memory.verified) {
    score += 15;
    reasons.push("Verified");
  }
  if (layerBoost.has(memory.layer)) {
    score += 20;
    reasons.push(`Relevant ${memory.layer} layer`);
  }

  const ageDays = (Date.now() - new Date(memory.updatedAt).getTime()) / 86400000;
  score += Math.max(0, 15 - ageDays * 0.5);
  if (ageDays < 7) reasons.push("Recently updated");

  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 8;
      if (reasons.length < 4) reasons.push(`Matches "${token}"`);
    }
  }

  return { memory, score, reasons };
}

export async function retrieveMemoriesForQuery(
  query: string,
  options?: {
    layers?: MemoryLayer[];
    limit?: number;
    minScore?: number;
  }
): Promise<RetrievedMemory[]> {
  const queryTokens = tokenize(query);
  const layerBoost = new Set(options?.layers ?? []);

  const { items } = await searchMemories({
    layer: options?.layers,
    limit: Math.max((options?.limit ?? 8) * 4, 32),
    archived: false,
  });

  const ranked = items
    .map((m) => scoreMemory(m, queryTokens, layerBoost))
    .filter((r) => r.score >= (options?.minScore ?? 10))
    .sort((a, b) => b.score - a.score)
    .slice(0, options?.limit ?? 8);

  return ranked;
}

export async function retrieveMemoriesForPage(page: string, limit = 6): Promise<RetrievedMemory[]> {
  const pageLayerMap: Record<string, MemoryLayer[]> = {
    dashboard: ["business", "operational", "financial"],
    crm: ["crm", "business"],
    crm_profile: ["crm"],
    bookings: ["business", "crm", "financial"],
    pipeline: ["business", "crm", "financial"],
    analytics: ["business", "marketing"],
    marketing: ["marketing", "brand", "creative"],
    sessions: ["sessions", "creative", "marketing"],
    applications: ["sessions", "crm"],
    sponsorship: ["sponsor", "marketing", "business"],
    insights: ["business", "operational", "marketing"],
    assistant: ["business", "crm", "marketing"],
    memory: ["business", "crm", "brand"],
  };

  const layers = pageLayerMap[page] ?? ["business", "operational"];
  const { items } = await searchMemories({ layer: layers, limit: limit * 3, archived: false });

  return items
    .map((m) => scoreMemory(m, tokenize(page), new Set(layers)))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatRetrievedMemoriesForPrompt(retrieved: RetrievedMemory[]): string {
  if (retrieved.length === 0) {
    return "No structured memories matched this query. Use live business tools and state assumptions clearly.";
  }

  return retrieved
    .map((r, i) => {
      const m = r.memory;
      return `[${i + 1}] ${m.layer}/${m.category} · ${m.title || m.key}
Summary: ${m.summary || JSON.stringify(m.value).slice(0, 280)}
Confidence: ${Math.round(m.confidence * 100)}% · Source: ${m.source}${m.verified ? " · verified" : ""}
Data: ${JSON.stringify(m.value).slice(0, 500)}`;
    })
    .join("\n\n");
}

export function toMemoryCitations(retrieved: RetrievedMemory[]): MemoryCitation[] {
  return retrieved.map((r) => ({
    memoryId: r.memory.id,
    layer: r.memory.layer,
    title: r.memory.title || r.memory.key,
    summary: r.memory.summary,
    confidence: r.memory.confidence,
    source: r.memory.source,
  }));
}

export async function buildRAGContext(query: string, page?: string): Promise<string> {
  const [queryMemories, pageMemories] = await Promise.all([
    retrieveMemoriesForQuery(query, { limit: 6 }),
    page ? retrieveMemoriesForPage(page, 4) : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const merged: RetrievedMemory[] = [];
  for (const r of [...queryMemories, ...pageMemories]) {
    if (seen.has(r.memory.id)) continue;
    seen.add(r.memory.id);
    merged.push(r);
  }

  return `${formatRetrievedMemoriesForPrompt(merged.slice(0, 10))}

Learning from past outcomes:
${await getLearningSummaryForPrompt()}`;
}
