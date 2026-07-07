import { getLearningOutcomes } from "../memory/learning";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { DecisionJournalEntry } from "./types";

export async function buildDecisionJournal(limit = 20): Promise<DecisionJournalEntry[]> {
  const [outcomes, missionMemories] = await Promise.all([
    getLearningOutcomes(undefined, limit * 2),
    searchMemories({
      workspaceId: getWorkspaceId(),
      category: "mission_outcome",
      limit: 10,
    }),
  ]);

  const entries: DecisionJournalEntry[] = [];

  for (const o of outcomes) {
    const isRejected = o.outcome === "negative";
    const isAccepted = o.outcome === "positive" || o.outcome === "neutral";

    entries.push({
      id: o.id,
      recommendation: o.hypothesis || o.actionRef || o.actionType,
      status: isRejected ? "rejected" : isAccepted ? "completed" : "pending",
      outcome: o.outcome as DecisionJournalEntry["outcome"],
      revenueImpact: o.revenueImpact ?? undefined,
      lesson: `${o.domain}: ${o.actionType} → ${o.outcome}`,
      recordedAt: o.createdAt,
      domain: o.domain,
      predictionAccuracy:
        o.outcome === "positive" ? 0.85 : o.outcome === "negative" ? 0.25 : 0.5,
    });
  }

  for (const m of missionMemories.items) {
    const val = m.value as { worked?: boolean; revenueImpact?: number; bookingsImpact?: number };
    entries.push({
      id: m.id,
      recommendation: m.title.replace(/^Mission: /, ""),
      status: "completed",
      outcome: val.worked ? "positive" : "negative",
      revenueImpact: val.revenueImpact,
      bookingImpact: val.bookingsImpact,
      lesson: m.summary,
      recordedAt: m.updatedAt,
      domain: "mission",
      predictionAccuracy: val.worked ? 0.9 : 0.3,
    });
  }

  return entries
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, limit);
}
