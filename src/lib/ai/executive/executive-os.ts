import { getCached, setCache } from "../cache";
import { getExecutiveIntelligence } from "../intelligence/executive-intelligence";
import { getExecutiveForecasts } from "../intelligence/forecasting";
import { getAIDailyBriefing } from "../intelligence/daily-briefing";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { buildCEOBrief } from "./roles/ceo";
import { buildCMOBrief } from "./roles/cmo";
import { buildCSOBrief } from "./roles/cso";
import { buildCreativeBrief } from "./roles/creative";
import { buildBrandBrief } from "./roles/brand";
import { buildClientSuccessBrief } from "./roles/client-success";
import { buildOperationsBrief } from "./roles/operations";
import { buildDecisionEngineContext } from "./decision-engine";
import { getSelfImprovementLessons } from "./self-improvement";
import { strengthenKnowledgeGraph, getKnowledgeGraphStats } from "./graph-builder";
import { syncBusinessMemory } from "../memory/sync";
import { synthesizeExecutiveBriefing } from "./synthesizer";
import { getAllExecutiveOpportunities } from "../intelligence/website-opportunities";
import { getEmbeddingStats } from "../memory/embeddings";
import { computeNorthStarMetrics } from "./north-star";
import { detectRevenueLeaks } from "./revenue-leaks";
import { generateWeeklyExecutiveReport } from "../intelligence/weekly-executive-report";
import type { ExecutiveOS, CommandCenterState } from "./types";
import { EXECUTIVE_MISSION } from "./types";

function scoreVal(scores: { key: string; value: number }[], key: string, fallback = 50) {
  return scores.find((s) => s.key === key)?.value ?? fallback;
}

export async function getExecutiveOS(force = false): Promise<ExecutiveOS> {
  const cacheKey = "executive-os-v2";
  if (!force) {
    const cached = await getCached<ExecutiveOS>(cacheKey);
    if (cached) return cached;
  } else {
    syncBusinessMemory().catch(() => {});
    strengthenKnowledgeGraph().catch(() => {});
  }

  const [
    intelligence,
    briefing,
    roles,
    decisionContext,
    predictions,
    selfImprovement,
    graphStats,
    metrics,
    allOpportunities,
    embeddingStats,
    northStar,
    revenueLeaks,
    weeklyReport,
  ] = await Promise.all([
    getExecutiveIntelligence(force),
    getAIDailyBriefing(force),
    Promise.all([
      buildCEOBrief(),
      buildCMOBrief(),
      buildCSOBrief(),
      buildCreativeBrief(),
      buildBrandBrief(),
      buildClientSuccessBrief(),
      buildOperationsBrief(),
    ]),
    buildDecisionEngineContext(),
    getExecutiveForecasts(),
    getSelfImprovementLessons(10),
    force ? strengthenKnowledgeGraph() : getKnowledgeGraphStats(),
    getOperatorMetrics(),
    getAllExecutiveOpportunities(),
    getEmbeddingStats(),
    computeNorthStarMetrics(),
    detectRevenueLeaks(),
    generateWeeklyExecutiveReport(),
  ]);

  const synthesis = synthesizeExecutiveBriefing({
    roles,
    intelligence: { ...intelligence, opportunities: allOpportunities },
    opportunities: allOpportunities,
  });

  const cmoRole = roles.find((r) => r.id === "cmo");
  void cmoRole;
  const execScores = intelligence.scores;

  const urgentAlerts: CommandCenterState["urgentAlerts"] = [];

  if (metrics.attention.abandonedInquiries > 0) {
    urgentAlerts.push({
      id: "stale-inquiries",
      title: `${metrics.attention.abandonedInquiries} booking inquiries need response`,
      detail: "Inquiries untouched 3+ days — revenue at risk",
      href: "/admin/submissions?type=booking",
      severity: "high",
    });
  }
  if (metrics.attention.galleriesAwaiting > 0) {
    urgentAlerts.push({
      id: "galleries",
      title: `${metrics.attention.galleriesAwaiting} galleries awaiting delivery`,
      detail: "Client satisfaction risk",
      href: "/admin/submissions?type=booking",
      severity: "medium",
    });
  }
  for (const risk of intelligence.risks.filter((r) => r.severity === "critical" || r.severity === "high").slice(0, 2)) {
    urgentAlerts.push({
      id: risk.id,
      title: risk.title,
      detail: risk.detail,
      href: risk.mitigations[0]?.href ?? "/admin/risks",
      severity: risk.severity,
    });
  }

  const commandCenter: CommandCenterState = {
    morningBriefing: synthesis.narrative || briefing.summary,
    businessHealth: scoreVal(execScores, "businessHealth"),
    marketingHealth: scoreVal(execScores, "marketing"),
    salesHealth: scoreVal(execScores, "sales"),
    revenueHealth: scoreVal(execScores, "revenue"),
    websiteHealth: Math.min(100, Math.round(metrics.traffic.conversionRate * 10 + 40)),
    seoHealth: Math.min(100, Math.round(50 + metrics.traffic.visitors30 / 30)),
    brandHealth: scoreVal(execScores, "brand"),
    clientHealth: scoreVal(execScores, "clientExperience"),
    operationsHealth: scoreVal(execScores, "operations"),
    topOpportunity: allOpportunities[0] ?? intelligence.opportunities[0] ?? null,
    topRisk: intelligence.risks[0] ?? null,
    highestRoiTask: synthesis.topPriorities[0]
      ? {
          title: synthesis.topPriorities[0].title,
          why: synthesis.topPriorities[0].why,
          revenueImpact: synthesis.topPriorities[0].expectedRevenue,
          href: synthesis.topPriorities[0].href,
          confidence: synthesis.topPriorities[0].confidence,
        }
      : briefing.executive.highestRoiAction
        ? {
            title: briefing.executive.highestRoiAction.title,
            why: briefing.executive.highestRoiAction.why,
            revenueImpact: briefing.executive.highestRoiAction.revenueImpact,
            href: briefing.executive.highestRoiAction.href,
            confidence: 0.85,
          }
        : null,
    highestPriorityTask: synthesis.topPriorities[0]
      ? {
          title: synthesis.topPriorities[0].title,
          href: synthesis.topPriorities[0].href,
          urgency: synthesis.topPriorities[0].urgency,
        }
      : roles[0]
        ? {
            title: roles[0].topPriority,
            href: roles[0].href,
            urgency: urgentAlerts.length > 0 ? "urgent" : "normal",
          }
        : null,
    urgentAlerts,
    scores: execScores,
  };

  const os: ExecutiveOS = {
    generatedAt: new Date().toISOString(),
    mission: [...EXECUTIVE_MISSION],
    roles,
    commandCenter,
    intelligence: { ...intelligence, opportunities: allOpportunities },
    synthesis,
    cmoBriefing: briefing.cmo,
    decisionContext,
    predictions,
    automationQueue: intelligence.executionDrafts,
    selfImprovement,
    knowledgeGraph: graphStats,
    embeddingStats,
    northStar,
    revenueLeaks,
    weeklyReport,
    transparency: {
      dataSources: [
        ...intelligence.transparency.dataSources,
        "Executive role modules (7 directors)",
        "Decision engine cross-checks",
        "Knowledge graph (AIMemory + relations)",
        `Semantic index (${embeddingStats.chunks} chunks, ${embeddingStats.mode} embeddings)`,
        "Multi-director synthesis engine",
      ],
      facts: decisionContext.facts,
      predictions: [...decisionContext.predictions, ...predictions.map((p) => `${p.label}: ${p.predicted}`)],
      suggestions: decisionContext.suggestions,
      inferences: decisionContext.inferences,
      unknowns: [...decisionContext.unknowns, ...intelligence.transparency.unknowns],
    },
  };

  await setCache(cacheKey, os, 10 * 60 * 1000);
  return os;
}
