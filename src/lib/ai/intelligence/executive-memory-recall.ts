import { searchMemories } from "../memory/store";
import { getLearningOutcomes } from "../memory/learning";
import type { ExecutiveMemoryEntry, ExecutiveMemorySnapshot } from "../types";

function toEntry(
  mem: { id: string; title: string; summary: string; tags: string[]; createdAt: string; value: Record<string, unknown> },
  type: ExecutiveMemoryEntry["type"]
): ExecutiveMemoryEntry {
  const outcomeRaw = mem.value.outcome || mem.value.status || mem.tags.find((t) => ["success", "failure", "winner"].includes(t));
  let outcome: ExecutiveMemoryEntry["outcome"] = "neutral";
  if (outcomeRaw === "positive" || outcomeRaw === "success" || outcomeRaw === "winner_declared") outcome = "success";
  if (outcomeRaw === "negative" || outcomeRaw === "failure") outcome = "failure";
  if (mem.value.status === "recommended" || mem.value.status === "pending") outcome = "pending";

  return {
    id: mem.id,
    type,
    title: mem.title,
    outcome,
    summary: mem.summary,
    recordedAt: mem.createdAt,
    tags: mem.tags,
  };
}

export async function getExecutiveMemorySnapshot(): Promise<ExecutiveMemorySnapshot> {
  const [experiments, learnings, decisions] = await Promise.all([
    searchMemories({ layer: "marketing", category: "experiment", limit: 20, archived: false }),
    getLearningOutcomes(undefined, 15),
    searchMemories({ category: "executive_insight", limit: 15, archived: false }),
  ]);

  const experimentEntries = experiments.items.map((m) => toEntry(m, "experiment"));

  const lessonEntries: ExecutiveMemoryEntry[] = learnings.map((l) => ({
    id: l.id,
    type: "lesson",
    title: l.hypothesis || l.actionType,
    outcome: l.outcome === "positive" ? "success" : l.outcome === "negative" ? "failure" : "neutral",
    summary: `${l.domain}: ${l.actionType} → ${l.outcome}${l.revenueImpact ? ` ($${l.revenueImpact})` : ""}`,
    recordedAt: l.createdAt,
    tags: [l.domain, l.outcome],
  }));

  const decisionEntries = decisions.items.map((m) => toEntry(m, "decision"));

  const failures = [...experimentEntries, ...lessonEntries].filter((e) => e.outcome === "failure");
  const wins = [...experimentEntries, ...lessonEntries].filter((e) => e.outcome === "success");

  const avoidSuggestions = failures
    .slice(0, 6)
    .map((f) => `Avoid repeating: ${f.title} (${f.summary})`);

  const provenWins = wins
    .slice(0, 6)
    .map((w) => `Proven win: ${w.title}`);

  return {
    generatedAt: new Date().toISOString(),
    decisions: decisionEntries,
    experiments: experimentEntries,
    lessons: lessonEntries,
    avoidSuggestions,
    provenWins,
  };
}
