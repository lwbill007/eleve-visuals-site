import { getExecutiveIntelligence } from "../intelligence/executive-intelligence";
import { getExecutiveForecasts } from "../intelligence/forecasting";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getRevenueAttributionFunnel } from "../intelligence/revenue-attribution";
import { getWebsiteHeatIntelligence } from "../intelligence/website-heat";
import { getClientIntelligenceSummary } from "../intelligence/client-intelligence";
import { getExtendedBookingIntelligence } from "../intelligence/booking-intelligence-ext";
import { getPrioritizedRecommendations } from "../intelligence/executive-prioritization";
import { getExecutiveMemorySnapshot } from "../intelligence/executive-memory-recall";
import { getLearningOutcomes } from "../memory/learning";
import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { buildExplainableHealthDomains } from "./explainable-health";
import { buildTheOneThing, buildTodaysMissions } from "./mission-control";
import { qualifyMetric } from "./data-quality";
import type {
  ExecutiveOperatingSystem,
  InstitutionalLearning,
  EnrichedForecast,
  RevenueJourneyNode,
  PageIntelligenceScore,
  ClientRanked,
} from "./operating-system-types";

function buildInstitutionalMemory(
  snapshot: Awaited<ReturnType<typeof getExecutiveMemorySnapshot>>,
  learnings: Awaited<ReturnType<typeof getLearningOutcomes>>
): InstitutionalLearning[] {
  const items: InstitutionalLearning[] = [];

  for (const l of learnings) {
    items.push({
      id: l.id,
      lesson: l.hypothesis || `${l.actionType} → ${l.outcome}`,
      evidence: l.metrics ? [JSON.stringify(l.metrics)] : [l.domain, l.outcome],
      source: `${l.domain} / ${l.actionType}`,
      confidence: l.confidence,
      businessImpact: l.revenueImpact ? `$${l.revenueImpact.toLocaleString()}` : l.outcome,
      learnedAt: l.createdAt,
      timesReferenced: 1,
      status: l.outcome === "positive" ? "verified" : "estimated",
    });
  }

  for (const w of snapshot.provenWins.slice(0, 5)) {
    items.push({
      id: `win-${w.slice(0, 24)}`,
      lesson: w.replace("Proven win: ", ""),
      evidence: ["Learning engine", "Campaign memory"],
      source: "Executive memory",
      confidence: 0.85,
      businessImpact: "Positive outcome recorded",
      learnedAt: snapshot.generatedAt,
      timesReferenced: 2,
      status: "verified",
    });
  }

  return items.slice(0, 12);
}

function buildRevenueJourney(
  funnel: Awaited<ReturnType<typeof getRevenueAttributionFunnel>>,
  metrics: Awaited<ReturnType<typeof getOperatorMetrics>>
): RevenueJourneyNode {
  const steps = funnel.steps;
  const chain = (idx: number): RevenueJourneyNode | undefined => {
    const s = steps[idx];
    if (!s) return undefined;
    const child = chain(idx + 1);
    return {
      id: s.id,
      label: s.label,
      value: s.id === "revenue" ? `$${s.count.toLocaleString()}` : s.count.toLocaleString(),
      quality: s.id === "revenue" && metrics.revenue.thisMonth > 0 ? "verified" : "calculated",
      children: child ? [child] : undefined,
    };
  };
  return (
    chain(0) ?? {
      id: "revenue",
      label: "Revenue",
      value: `$${metrics.revenue.thisMonth.toLocaleString()}`,
      quality: "verified",
    }
  );
}

function buildPageScores(heat: Awaited<ReturnType<typeof getWebsiteHeatIntelligence>>): PageIntelligenceScore[] {
  return heat.topConverters.concat(heat.ignoredSections).slice(0, 8).map((p) => ({
    path: p.path,
    label: p.label,
    trafficScore: Math.min(100, Math.round(p.views / 2)),
    conversionScore: Math.min(100, Math.round(p.conversionRate * 25)),
    seoScore: p.path.length < 30 ? 75 : 60,
    brandScore: p.path.startsWith("/portfolio") ? 85 : 70,
    uxScore: p.conversionRate > 2 ? 80 : 55,
    trustScore: p.path === "/" || p.path.includes("about") ? 80 : 65,
    revenueScore: Math.min(100, Math.round(p.conversions * 20 + p.conversionRate * 10)),
    contentScore: p.engagementScore,
    explanation: p.insight,
  }));
}

function rankClients(clients: Awaited<ReturnType<typeof getClientIntelligenceSummary>>): ClientRanked[] {
  return clients.clients.map((c) => ({
    name: c.name,
    email: c.email,
    vipScore: Math.min(100, Math.round(c.lifetimeValue / 50 + (c.totalSessions > 1 ? 20 : 0))),
    ltv: c.lifetimeValue,
    referralPotential: c.referralCount > 0 ? 80 : 40,
    repeatProbability: c.churnRisk === "low" ? 75 : c.churnRisk === "medium" ? 45 : 20,
    engagementScore: c.churnRisk === "low" ? 85 : 50,
    satisfactionScore: c.churnRisk === "low" ? 90 : 65,
    churnRisk: c.churnRisk === "high" ? 80 : c.churnRisk === "medium" ? 50 : 20,
    nextBestAction: c.upsellOpportunities[0] ?? c.followUpReminder ?? "Maintain relationship",
    href: `/admin/crm`,
  }));
}

export async function buildExecutiveOperatingSystem(): Promise<ExecutiveOperatingSystem> {
  const [
    theOneThing,
    todaysMissions,
    healthDomains,
    intelligence,
    metrics,
    funnel,
    heat,
    clients,
    booking,
    recs,
    memorySnap,
    learnings,
    forecasts,
    crm,
  ] = await Promise.all([
    buildTheOneThing(),
    buildTodaysMissions(),
    buildExplainableHealthDomains(),
    getExecutiveIntelligence(),
    getOperatorMetrics(),
    getRevenueAttributionFunnel(),
    getWebsiteHeatIntelligence(),
    getClientIntelligenceSummary(12),
    getExtendedBookingIntelligence(),
    getPrioritizedRecommendations(3),
    getExecutiveMemorySnapshot(),
    getLearningOutcomes(undefined, 10),
    getExecutiveForecasts(),
    getAdminCRMContacts(),
  ]);

  const institutionalMemory = buildInstitutionalMemory(memorySnap, learnings);
  const topClient = [...crm].sort((a, b) => b.revenue - a.revenue)[0];

  const enrichedForecasts: EnrichedForecast[] = forecasts.map((f) => ({
    ...f,
    confidenceInterval: `$${f.low.toLocaleString()} – $${f.high.toLocaleString()}`,
    historicalComparison: `Current: ${typeof f.current === "number" && f.metric === "revenue" ? `$${f.current.toLocaleString()}` : f.current}`,
    riskFactors: f.unknowns,
    howToImprove: f.assumptions[0] ?? "Address stale inquiries and maintain marketing cadence",
  }));

  const marketingRec = recs.find((r) => r.category === "marketing") ?? recs[0];

  return {
    generatedAt: new Date().toISOString(),
    theOneThing,
    morningBriefing: {
      biggestWin:
        metrics.month.bookingsChange > 0
          ? `${metrics.month.bookings} bookings MTD (+${metrics.month.bookingsChange}%)`
          : metrics.traffic.instagramReferrals > 0
            ? `${metrics.traffic.instagramReferrals} Instagram referrals (30d)`
            : "Pipeline stable — focus on conversion",
      biggestLeak:
        funnel.biggestLeak
          ? `${funnel.biggestLeak.label}: ~$${funnel.biggestLeak.estimatedRevenueLost.toLocaleString()} lost at this step`
          : "No critical funnel leak detected",
      biggestOpportunity: recs[0]?.title ?? "Refresh intelligence for opportunities",
      whatAiLearned:
        institutionalMemory[0]?.lesson ?? "Complete missions to build institutional knowledge",
    },
    healthDomains,
    highestRoiOpportunity: intelligence.opportunities[0] ?? null,
    highestRisk: intelligence.risks[0] ?? null,
    criticalNotifications: [
      ...(metrics.attention.abandonedInquiries > 0
        ? [
            {
              id: "stale",
              title: `${metrics.attention.abandonedInquiries} inquiries need response`,
              detail: "Revenue at risk without follow-up",
              href: "/admin/submissions?type=booking",
              severity: "high",
            },
          ]
        : []),
      ...intelligence.risks.slice(0, 2).map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.detail,
        href: r.mitigations[0]?.href ?? "/admin/risks",
        severity: r.severity,
      })),
    ],
    todaysMissions,
    revenueJourney: buildRevenueJourney(funnel, metrics),
    salesIntelligence: {
      potentialRevenue: qualifyMetric({
        value: metrics.revenue.pipeline,
        quality: "calculated",
        updatedAt: metrics.generatedAt,
        source: "Pipeline",
      }),
      leadsLikelyToClose: booking.lostInquiries.slice(0, 3).map((l) => ({
        name: l.name,
        value: l.estimatedValue,
        probability: Math.max(20, 70 - l.daysSince * 5),
        href: l.href,
      })),
      pipelineProbability: qualifyMetric({
        value: booking.bookingRate,
        quality: "calculated",
        updatedAt: booking.generatedAt,
        confidence: 0.8,
        source: "Submissions",
      }),
      lostRevenue: qualifyMetric({
        value: booking.lostInquiries.reduce((s, l) => s + l.estimatedValue, 0),
        quality: "estimated",
        updatedAt: booking.generatedAt,
        source: "Stale inquiries",
      }),
      missedFollowUps: metrics.attention.followUpClients,
      recommendedConversations: booking.lostInquiries.slice(0, 3).map((l) => `Follow up with ${l.name} — ${l.reason}`),
      highestValueClientToday: topClient
        ? {
            name: topClient.name,
            value: topClient.revenue,
            action: "VIP check-in or upsell conversation",
            href: "/admin/crm",
          }
        : null,
    },
    marketingIntelligence: {
      recommendation: marketingRec?.title ?? "Feature top portfolio on Instagram",
      why: marketingRec?.whyNow ?? "Drive qualified traffic to booking funnel",
      expectedReach: qualifyMetric({
        value: metrics.traffic.visitors30,
        quality: "verified",
        updatedAt: metrics.generatedAt,
        source: "Analytics",
      }),
      expectedBookings: qualifyMetric({
        value: Math.round(metrics.traffic.visitors30 * (metrics.traffic.conversionRate / 100)),
        quality: "estimated",
        updatedAt: metrics.generatedAt,
        confidence: 0.65,
      }),
      expectedRevenue: qualifyMetric({
        value: marketingRec?.estimatedRevenue ?? 0,
        quality: "estimated",
        updatedAt: new Date().toISOString(),
        confidence: marketingRec?.confidence ?? 0.6,
      }),
      historicalComparison: `Site converts at ${metrics.traffic.conversionRate}% (30d)`,
      confidence: marketingRec?.confidence ?? 0.65,
      evidence: marketingRec?.evidence ?? [],
    },
    clientIntelligence: rankClients(clients),
    websiteIntelligence: buildPageScores(heat),
    institutionalMemory,
    predictions: enrichedForecasts,
    aiDecisions: intelligence.decisions.slice(0, 4).map((d) => ({
      id: d.id,
      title: d.title,
      why: d.recommendation,
      evidence: d.evidence,
      confidence: d.confidence,
      revenueImpact: d.estimatedRoi,
      downside: d.riskLevel === "high" ? "High execution risk" : "Low if delayed",
      href: d.actions[0]?.href ?? "/admin/opportunities",
    })),
  };
}
