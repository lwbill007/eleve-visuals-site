import { getAllExecutiveOpportunities } from "./website-opportunities";
import { detectRevenueLeaks } from "../executive/revenue-leaks";
import { recommendExperiments } from "../marketing/experiment-engine";
import type { ExecutiveOpportunity, PrioritizedRecommendation, RecommendationDifficulty, RecommendationPriority } from "../types";

function effortToDifficulty(effort: ExecutiveOpportunity["effort"]): RecommendationDifficulty {
  return effort === "low" ? "easy" : effort === "high" ? "hard" : "moderate";
}

function opportunityToPrioritized(o: ExecutiveOpportunity, whyNow: string): PrioritizedRecommendation {
  return {
    id: o.id,
    title: o.title,
    detail: o.detail,
    category: o.category,
    estimatedRevenue: o.expectedRevenue,
    confidence: o.confidence,
    timeToCompleteMinutes: o.estimatedMinutes,
    difficulty: effortToDifficulty(o.effort),
    priority: o.urgency as RecommendationPriority,
    whyNow,
    evidence: o.evidence,
    actions: o.actions,
  };
}

export async function getPrioritizedRecommendations(limit = 12): Promise<PrioritizedRecommendation[]> {
  const [opportunities, leaks, experiments] = await Promise.all([
    getAllExecutiveOpportunities(),
    detectRevenueLeaks(),
    recommendExperiments().catch(() => []),
  ]);

  const recs: PrioritizedRecommendation[] = [];

  for (const o of opportunities) {
    recs.push(
      opportunityToPrioritized(o, o.why || `Expected impact: ${o.impact}. Urgency: ${o.urgency}.`)
    );
  }

  for (const leak of leaks.slice(0, 4)) {
    recs.push({
      id: leak.id,
      title: `Fix revenue leak: ${leak.title}`,
      detail: leak.reason,
      category: "revenue",
      estimatedRevenue: leak.recoveryPotential,
      confidence: leak.confidence,
      timeToCompleteMinutes: 30,
      difficulty: "moderate",
      priority: leak.confidence > 0.8 ? "high" : "medium",
      whyNow: `~$${leak.estimatedLoss.toLocaleString()} currently at risk`,
      evidence: leak.evidence,
      actions: leak.actions,
    });
  }

  for (const exp of experiments.slice(0, 3)) {
    recs.push({
      id: exp.id,
      title: exp.title,
      detail: exp.hypothesis,
      category: "marketing",
      estimatedRevenue: 0,
      confidence: exp.confidence,
      timeToCompleteMinutes: 45,
      difficulty: "moderate",
      priority: "medium",
      whyNow: exp.recommendation,
      evidence: [exp.platform, exp.variable, "Dollar impact Unknown — experiment revenue not measured"],
      actions: [
        { id: "marketing", label: "Open Marketing Studio", type: "navigate", href: "/admin/marketing" },
      ],
    });
  }

  const priorityRank: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return recs
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        b.estimatedRevenue * b.confidence - a.estimatedRevenue * a.confidence
    )
    .slice(0, limit);
}

export async function getHighestRoiRecommendation(): Promise<PrioritizedRecommendation | null> {
  const { getGuardedRecommendations } = await import("../truth/recommendation-guardrails");
  const recs = await getGuardedRecommendations(1);
  return recs[0] ?? null;
}
