import { getOperatorMetrics, getMarketingRecommendations, OS_ROUTES } from "../intelligence/business-operator";
import { getProactiveBusinessInsights } from "../intelligence/business-operator";
import { getExecutiveRisks } from "../intelligence/risk-center";
import { getExecutiveOpportunities } from "../intelligence/opportunity-engine";
import { buildBrandInstitutionalMemory, getBrandInstitutionalMemory } from "./brand-memory";
import { listCampaignCaseStudies } from "./campaign-memory";
import { discoverMarketingPatterns, getStoredPatterns } from "./learning-engine";
import { recommendExperiments } from "./experiment-engine";
import { generateMarketingPredictions } from "./prediction-engine";
import { listCompetitorProfiles, analyzeCompetitiveOpportunities } from "./competitive-intel";
import { buildClientMarketingProfiles } from "./client-intel";
import { rankMarketingRevenue } from "./revenue-intel";
import { computeCMOScores } from "./cmo-scores";
import { buildTransparentRecommendation } from "./transparency";
import type { CMOIntelligence, CMODailyBriefing, TransparentRecommendation } from "./types";
import type { BusinessAction } from "../types";

function action(id: string, label: string, href: string): BusinessAction {
  return { id, label, type: "navigate", href };
}

export async function syncCMOMemory(): Promise<{ synced: number }> {
  await buildBrandInstitutionalMemory();
  const patterns = await discoverMarketingPatterns();
  return { synced: patterns.length + 1 };
}

export async function getCMOIntelligence(forceRefresh = false): Promise<CMOIntelligence> {
  if (forceRefresh) {
    await syncCMOMemory().catch(() => {});
  }

  const [
    brand,
    campaigns,
    patterns,
    experiments,
    predictions,
    competitors,
    clientProfiles,
    revenueAttribution,
    scores,
    marketingRecs,
    insights,
    opportunities,
    risks,
    metrics,
  ] = await Promise.all([
    getBrandInstitutionalMemory(),
    listCampaignCaseStudies(30),
    getStoredPatterns(15),
    recommendExperiments(),
    generateMarketingPredictions(),
    listCompetitorProfiles(),
    buildClientMarketingProfiles(15),
    rankMarketingRevenue(),
    computeCMOScores(),
    getMarketingRecommendations(),
    getProactiveBusinessInsights(),
    getExecutiveOpportunities(),
    getExecutiveRisks(),
    getOperatorMetrics(),
  ]);

  const competitiveOpportunities = analyzeCompetitiveOpportunities(
    competitors,
    brand?.competitiveAdvantages ?? []
  );

  const recommendations: TransparentRecommendation[] = [];

  for (const rec of marketingRecs.slice(0, 5)) {
    recommendations.push(
      buildTransparentRecommendation({
        id: rec.id,
        title: rec.title,
        detail: rec.reason,
        why: rec.reason,
        kind: "fact",
        confidence: 0.82,
        historicalEvidence: patterns.slice(0, 2).map((p) => p.pattern),
        supportingMetrics: [`${metrics.traffic.visitors30} visitors/30d`, `${metrics.traffic.conversionRate}% conversion`],
        expectedImpact: rec.priority === "high" ? "High" : "Medium",
        priority: rec.priority === "high" ? 85 : rec.priority === "medium" ? 65 : 45,
        actions: rec.actions,
      })
    );
  }

  for (const opp of opportunities.filter((o) => o.category === "marketing").slice(0, 3)) {
    recommendations.push(
      buildTransparentRecommendation({
        id: opp.id,
        title: opp.title,
        detail: opp.detail,
        why: opp.why,
        kind: "prediction",
        confidence: opp.confidence,
        historicalEvidence: opp.evidence,
        supportingMetrics: [`~$${opp.expectedRevenue.toLocaleString()} expected revenue`],
        alternatives: [{ label: "Wait for more data", tradeoff: "May miss timing window" }],
        expectedImpact: opp.impact,
        priority: opp.urgency === "critical" ? 95 : opp.urgency === "high" ? 80 : 60,
        actions: opp.actions,
      })
    );
  }

  for (const exp of experiments.slice(0, 3)) {
    recommendations.push(
      buildTransparentRecommendation({
        id: exp.id,
        title: exp.title,
        detail: exp.hypothesis,
        why: exp.recommendation,
        kind: "idea",
        confidence: exp.confidence,
        historicalEvidence: patterns.filter((p) => p.category === exp.variable as string).map((p) => p.pattern),
        expectedImpact: "Learning + conversion improvement",
        priority: 70,
        actions: [action("run-test", "Open Marketing Studio", OS_ROUTES.marketingCampaign)],
      })
    );
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  const marketingRisks = risks.filter((r) => r.category === "marketing" || r.category === "revenue");
  const biggestOpportunity = recommendations[0] ?? null;
  const biggestRisk: TransparentRecommendation | null = marketingRisks[0]
    ? buildTransparentRecommendation({
        id: marketingRisks[0].id,
        title: marketingRisks[0].title,
        detail: marketingRisks[0].detail,
        why: marketingRisks[0].why,
        kind: "fact",
        confidence: marketingRisks[0].likelihood / 100,
        historicalEvidence: marketingRisks[0].evidence,
        expectedImpact: `Potential impact: $${marketingRisks[0].potentialImpact.toLocaleString()}`,
        priority: 90,
        actions: marketingRisks[0].mitigations,
      })
    : null;

  const highestRoi = revenueAttribution[0]
    ? buildTransparentRecommendation({
        id: "highest-roi-channel",
        title: `Invest more in ${revenueAttribution[0].activity}`,
        detail: `Ranked #1 by estimated revenue ($${revenueAttribution[0].revenue.toLocaleString()})`,
        why: revenueAttribution[0].evidence.join(" · "),
        kind: "fact",
        confidence: 0.8,
        historicalEvidence: revenueAttribution[0].evidence,
        supportingMetrics: [`ROI ${revenueAttribution[0].roi}%`, `Conv ${revenueAttribution[0].conversionRate}%`],
        expectedImpact: `$${revenueAttribution[0].revenue.toLocaleString()} estimated revenue`,
        priority: 92,
        actions: [action("analytics", "View Analytics", "/admin/analytics")],
      })
    : null;

  const autonomousInsights: string[] = [
    ...patterns.slice(0, 3).map((p) => `Pattern: ${p.pattern}`),
    ...insights.filter((i) => i.category === "marketing").slice(0, 2).map((i) => i.title),
    ...competitiveOpportunities.slice(0, 2),
  ];

  if (metrics.attention.abandonedInquiries > 0) {
    autonomousInsights.unshift(
      `${metrics.attention.abandonedInquiries} booking inquiries untouched 3+ days — recovery campaign recommended`
    );
  }

  const briefing: CMODailyBriefing = {
    generatedAt: new Date().toISOString(),
    scores,
    biggestOpportunity,
    biggestRisk,
    recommendedActions: recommendations.slice(0, 8),
    highestRoiTask: highestRoi,
    autonomousInsights,
  };

  return {
    generatedAt: new Date().toISOString(),
    brand: brand!,
    campaigns,
    patterns,
    experiments,
    predictions,
    competitors,
    clientProfiles,
    revenueAttribution,
    briefing,
    recommendations,
    transparency: {
      dataSources: [
        "Brand CMS (site config, hero, services, portfolio, sessions)",
        "Analytics (30-day traffic, conversion, UTM)",
        "CRM contacts & booking history",
        "Pipeline revenue",
        "Campaign case studies (AIMemory)",
        "Marketing patterns & experiments",
        "Competitive profiles (admin-maintained)",
      ],
      facts: [
        `${metrics.traffic.visitors30} visitors in 30 days`,
        `${metrics.traffic.conversionRate}% conversion rate`,
        `${campaigns.length} campaign case studies on record`,
        `${patterns.length} discovered patterns`,
      ],
      predictions: predictions.map((p) => `${p.subject}: ~$${p.expectedRevenue} revenue (${Math.round(p.probabilityOfSuccess * 100)}% success)`),
      assumptions: predictions.flatMap((p) => p.assumptions).slice(0, 6),
      ideas: experiments.map((e) => e.title),
    },
  };
}
