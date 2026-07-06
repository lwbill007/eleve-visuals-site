import { getCached, setCache } from "../cache";
import type { ExecutiveIntelligence } from "../types";
import { computeExecutiveScores } from "./executive-scores";
import { getAllExecutiveOpportunities } from "./website-opportunities";
import { getExecutiveRisks } from "./risk-center";
import { getExecutiveForecasts } from "./forecasting";
import { getBusinessTimeline } from "./business-timeline";
import { opportunitiesToDecisions } from "./decision-framework";
import { getExecutionDrafts } from "./execution-mode";
import { getOperatorMetrics } from "./business-operator";
import { detectRevenueLeaks } from "../executive/revenue-leaks";

export async function getExecutiveIntelligence(force = false): Promise<ExecutiveIntelligence> {
  const cacheKey = "executive-intelligence-v2";
  if (!force) {
    const cached = await getCached<ExecutiveIntelligence>(cacheKey);
    if (cached) return cached;
  }

  const metrics = await getOperatorMetrics();
  const [opportunities, risks, forecasts, timeline, executionDrafts, revenueLeaks] = await Promise.all([
    getAllExecutiveOpportunities(),
    getExecutiveRisks(),
    getExecutiveForecasts(),
    getBusinessTimeline(),
    getExecutionDrafts(),
    detectRevenueLeaks(),
  ]);

  const scores = computeExecutiveScores(metrics);
  const decisions = opportunitiesToDecisions(opportunities);
  const totalOpportunityRevenue = opportunities.reduce((s, o) => s + o.expectedRevenue, 0);

  const intelligence: ExecutiveIntelligence = {
    generatedAt: metrics.generatedAt,
    scores,
    opportunities,
    risks,
    decisions,
    timeline,
    forecasts,
    executionDrafts,
    totalOpportunityRevenue,
    revenueLeaks,
    transparency: {
      dataSources: [
        "Prisma submissions & pipeline",
        "Analytics events (30/7 day windows)",
        "CRM contact activity",
        "AIMemory & AILearningOutcome",
        "Session volumes",
      ],
      lastSynced: metrics.generatedAt,
      assumptions: [
        "Revenue estimates use pipeline values and industry recovery benchmarks",
        "Scores are heuristic — not predictive ML models",
        "Learning outcomes only from verified business events",
      ],
      unknowns: [
        "External ad spend ROI",
        "Offline referrals",
        "Unlogged client conversations",
      ],
    },
  };

  await setCache(cacheKey, intelligence, 10 * 60 * 1000);
  return intelligence;
}
