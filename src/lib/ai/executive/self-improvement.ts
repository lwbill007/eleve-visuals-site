import { getLearningOutcomes, recordLearningOutcome } from "../memory/learning";
import type { SelfImprovementLesson } from "./types";

export async function getSelfImprovementLessons(limit = 15): Promise<SelfImprovementLesson[]> {
  const outcomes = await getLearningOutcomes(undefined, limit * 3);
  const seen = new Set<string>();

  return outcomes
    .filter((o) => {
      const key = `${o.domain}:${(o.hypothesis || o.actionType).trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((o) => ({
    id: o.id,
    question: `Did ${o.actionType} in ${o.domain} work?`,
    outcome: o.outcome,
    confidenceChange:
      o.outcome === "positive"
        ? "increased"
        : o.outcome === "negative"
          ? "decreased"
          : "unchanged",
    lesson: o.hypothesis || `Observed ${o.actionType} with ${o.outcome} outcome`,
    recordedAt: o.createdAt,
    domain: o.domain,
  }));
}

export async function recordRecommendationFeedback(input: {
  recommendationId: string;
  title: string;
  worked: boolean;
  detail: string;
  revenueImpact?: number;
  memoryIds?: string[];
}): Promise<SelfImprovementLesson> {
  const outcome = input.worked ? "positive" : "negative";

  await recordLearningOutcome({
    domain: "executive",
    actionType: input.recommendationId,
    actionRef: input.title,
    hypothesis: input.detail,
    outcome,
    revenueImpact: input.revenueImpact,
    confidence: input.worked ? 0.85 : 0.4,
    memoryIds: input.memoryIds,
    outcomeEvidence: true,
  });

  return {
    id: input.recommendationId,
    question: `Did "${input.title}" work?`,
    outcome,
    confidenceChange: input.worked ? "increased" : "decreased",
    lesson: input.detail,
    recordedAt: new Date().toISOString(),
    domain: "executive",
  };
}

export async function evaluateRecommendationOutcome(
  recommendationId: string,
  metricsBefore: Record<string, number>,
  metricsAfter: Record<string, number>
): Promise<{ worked: boolean; lesson: string }> {
  const revenueDelta = (metricsAfter.revenue ?? 0) - (metricsBefore.revenue ?? 0);
  const bookingsDelta = (metricsAfter.bookings ?? 0) - (metricsBefore.bookings ?? 0);
  const worked = revenueDelta > 0 || bookingsDelta > 0;

  const lesson = worked
    ? `Recommendation ${recommendationId} correlated with +$${revenueDelta} revenue and +${bookingsDelta} bookings`
    : `Recommendation ${recommendationId} did not improve tracked metrics — confidence reduced`;

  await recordLearningOutcome({
    domain: "executive",
    actionType: "recommendation_eval",
    actionRef: recommendationId,
    hypothesis: lesson,
    outcome: worked ? "positive" : "negative",
    metrics: { revenueDelta, bookingsDelta },
    confidence: worked ? 0.8 : 0.35,
    outcomeEvidence: true,
  });

  return { worked, lesson };
}
