import { getLearningOutcomes } from "../memory/learning";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { loadDecisionJournalMemories } from "../platform/decision-recorder";
import type { DecisionJournalEntry } from "./types";

export async function buildDecisionJournal(limit = 20): Promise<DecisionJournalEntry[]> {
  const [outcomes, missionMemories, decisions] = await Promise.all([
    getLearningOutcomes(undefined, limit * 2),
    searchMemories({
      workspaceId: getWorkspaceId(),
      category: "mission_outcome",
      limit: 10,
    }),
    loadDecisionJournalMemories(limit),
  ]);

  const entries: DecisionJournalEntry[] = [...decisions];

  for (const o of outcomes) {
    const metrics = o.metrics as { status?: string; accuracy?: number; expectedROI?: number };
    const isRejected = o.outcome === "negative";
    const isPending = o.outcome === "neutral" || metrics.status === "accepted";

    entries.push({
      id: o.id,
      recommendation: o.hypothesis || o.actionRef || o.actionType,
      status: isRejected ? "rejected" : isPending ? "accepted" : "completed",
      outcome: o.outcome as DecisionJournalEntry["outcome"],
      revenueImpact: o.revenueImpact ?? undefined,
      lesson: `${o.domain}: ${o.actionType} → ${o.outcome}`,
      recordedAt: o.createdAt,
      domain: o.domain,
      predictionAccuracy:
        typeof metrics.accuracy === "number"
          ? metrics.accuracy
          : o.outcome === "positive"
            ? 0.85
            : o.outcome === "negative"
              ? 0.25
              : 0.5,
      expectedROI: typeof metrics.expectedROI === "number" ? metrics.expectedROI : undefined,
      confidence: o.confidence,
    });
  }

  for (const m of missionMemories.items) {
    const val = m.value as {
      worked?: boolean;
      revenueImpact?: number;
      bookingsImpact?: number;
      accuracy?: number;
    };
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
      predictionAccuracy: val.accuracy ?? (val.worked ? 0.9 : 0.3),
    });
  }

  // Dedupe by recommendation + day
  const seen = new Set<string>();
  return entries
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .filter((e) => {
      const key = `${e.recommendation.slice(0, 48)}:${e.recordedAt.slice(0, 10)}:${e.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
