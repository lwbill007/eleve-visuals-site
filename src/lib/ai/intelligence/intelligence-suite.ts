import { getRevenueAttributionFunnel } from "./revenue-attribution";
import { getGuardedRecommendations } from "../truth/recommendation-guardrails";
import { getHighestRoiRecommendation } from "./executive-prioritization";
import { getWebsiteHeatIntelligence } from "./website-heat";
import { getExtendedBookingIntelligence } from "./booking-intelligence-ext";
import { getContentIntelligence } from "./content-intelligence";
import { getClientIntelligenceSummary } from "./client-intelligence";
import { getFinancialIntelligence } from "./financial-intelligence";
import { getPredictiveInsights } from "./predictive-intelligence";
import { getExecutiveMemorySnapshot } from "./executive-memory-recall";
import { detectRevenueLeaks } from "../executive/revenue-leaks";
import { getExecutiveRisks } from "./risk-center";
import { getProactiveBusinessInsights } from "./business-operator";
import type { ExecutiveMorningBrief, IntelligenceSuite } from "../types";

export async function buildExecutiveMorningBrief(): Promise<ExecutiveMorningBrief> {
  const [recs, leaks, risks, insights, highestRoi] = await Promise.all([
    getGuardedRecommendations(5),
    detectRevenueLeaks(),
    getExecutiveRisks(),
    getProactiveBusinessInsights(),
    getHighestRoiRecommendation(),
  ]);

  const positiveInsights = insights.filter((i) => (i.revenueImpact ?? 0) > 0 || i.severity === "low");
  const biggestWin =
    positiveInsights[0]?.title ??
    (recs[0]?.estimatedRevenue > 0 ? `Pipeline opportunity: ${recs[0].title}` : "Operations steady — capacity available for growth");

  const topLeak = leaks[0];
  const biggestRevenueLeak = topLeak
    ? `${topLeak.title} — ~$${topLeak.estimatedLoss.toLocaleString()} at risk`
    : "No critical revenue leaks detected";

  const biggestOpportunity = recs[0]
    ? `${recs[0].title} (~$${recs[0].estimatedRevenue.toLocaleString()}, ${Math.round(recs[0].confidence * 100)}% confidence)`
    : "Run Intelligence Refresh to surface opportunities";

  const actionsToday = recs.slice(0, 3).map((r) => ({
    title: r.title,
    href: r.actions[0]?.href ?? "/admin/opportunities",
    revenueImpact: r.estimatedRevenue,
  }));

  const risksToWatch = risks.slice(0, 3).map((r) => `${r.title}: ${r.detail}`);
  const goalsToday = [
    recs[0]?.title ?? "Review executive command center",
    topLeak ? `Address: ${topLeak.title}` : "Maintain client follow-up cadence",
    "Protect brand quality on all outbound touchpoints",
  ];

  return {
    generatedAt: new Date().toISOString(),
    biggestWin,
    biggestRevenueLeak,
    biggestOpportunity,
    actionsToday,
    risksToWatch,
    goalsToday,
    highestRoiRecommendation: highestRoi,
  };
}

export async function getIntelligenceSuite(): Promise<IntelligenceSuite> {
  const [
    revenueAttribution,
    prioritizedRecommendations,
    websiteHeat,
    booking,
    content,
    clients,
    financial,
    predictive,
    executiveMemory,
    executiveMorning,
  ] = await Promise.all([
    getRevenueAttributionFunnel(),
    getGuardedRecommendations(),
    getWebsiteHeatIntelligence(),
    getExtendedBookingIntelligence(),
    getContentIntelligence(),
    getClientIntelligenceSummary(),
    getFinancialIntelligence(),
    getPredictiveInsights(),
    getExecutiveMemorySnapshot(),
    buildExecutiveMorningBrief(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    revenueAttribution,
    prioritizedRecommendations,
    websiteHeat,
    booking,
    content,
    clients,
    financial,
    predictive,
    executiveMemory,
    executiveMorning,
  };
}
