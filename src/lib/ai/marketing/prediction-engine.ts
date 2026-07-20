import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import type { MarketingPrediction, InsightKind } from "./types";
import { getStoredPatterns } from "./learning-engine";
import { listCampaignCaseStudies } from "./campaign-memory";

function predict(
  partial: Omit<MarketingPrediction, "id" | "kind"> & { kind?: InsightKind }
): MarketingPrediction {
  return {
    ...partial,
    id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: partial.kind ?? "prediction",
  };
}

export async function generateMarketingPredictions(): Promise<MarketingPrediction[]> {
  const [metrics, analytics, patterns, campaigns] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getStoredPatterns(8),
    listCampaignCaseStudies(10),
  ]);

  const conversionRate = analytics.totals.conversionRate / 100;
  const hasAvgBookingValue =
    metrics.month.bookings > 0 && metrics.revenue.thisMonth > 0;
  const avgBookingValue = hasAvgBookingValue
    ? metrics.revenue.thisMonth / metrics.month.bookings
    : null;
  const instagramVisits =
    analytics.topSources.find((s) => s.source.toLowerCase().includes("instagram"))?.visits ?? 0;

  const predictions: MarketingPrediction[] = [];

  predictions.push(
    predict({
      subject: "Instagram carousel (portfolio feature)",
      platform: "instagram",
      expectedEngagement: `${Math.round(instagramVisits * 0.08)}–${Math.round(instagramVisits * 0.15)} profile visits`,
      expectedLeads: Math.max(0, Math.round(instagramVisits * conversionRate * 0.3)),
      expectedBookings: Math.max(0, Math.round(instagramVisits * conversionRate * 0.1)),
      expectedRevenue: avgBookingValue
        ? Math.round(instagramVisits * conversionRate * 0.1 * avgBookingValue)
        : 0,
      expectedRoi: avgBookingValue
        ? "High if organic"
        : "Unknown — no verified avg booking value yet",
      probabilityOfSuccess: instagramVisits > 50 ? 0.72 : 0.55,
      confidence: avgBookingValue ? 0.7 : 0.35,
      basis: [
        `${instagramVisits} Instagram referrals (30d)`,
        `${analytics.totals.conversionRate}% site conversion`,
        avgBookingValue
          ? `Avg booking value $${Math.round(avgBookingValue).toLocaleString()} (from MTD metrics)`
          : "Avg booking value Unknown — revenue/bookings MTD insufficient",
        patterns.find((p) => p.category === "portfolio")?.pattern ?? "Portfolio drives trust",
      ],
      assumptions: ["Post during peak booking hours", "Strong CTA in caption", "Carousel with 5+ images"],
    })
  );

  predictions.push(
    predict({
      subject: "CRM re-engagement email campaign",
      platform: "email",
      expectedEngagement: `${metrics.attention.followUpClients} recipients`,
      expectedLeads: Math.round(metrics.attention.followUpClients * 0.15),
      expectedBookings: 0,
      expectedRevenue: 0,
      expectedRoi: "Unknown — cost and recovery rate not measured",
      probabilityOfSuccess: 0.55,
      confidence: 0.55,
      basis: [
        `${metrics.attention.followUpClients} inactive clients (Measured)`,
        metrics.attention.followUpValue > 0
          ? `Historical CRM association ~$${metrics.attention.followUpValue.toLocaleString()} (not recovery prediction)`
          : "More financial data required",
        patterns.find((p) => p.category === "client_ltv")?.pattern ?? "Repeat clients often higher LTV (general)",
      ],
      assumptions: ["Personalized subject line", "Include recent portfolio work", "Limited-time booking window"],
    })
  );

  predictions.push(
    predict({
      subject: "ÉLEVÉ Sessions application push",
      platform: "instagram",
      expectedEngagement: "Reach estimate unavailable without ad/organic analytics connector",
      expectedLeads: metrics.today.applications,
      expectedBookings: 0,
      expectedRevenue: 0,
      expectedRoi: "Indirect — do not invent brand equity % lift",
      probabilityOfSuccess: 0.5,
      confidence: 0.45,
      basis: [
        "Sessions support community and brand presence (qualitative)",
        `${metrics.today.applications} applications today (Measured)`,
      ],
      assumptions: ["Open volume accepting applications", "BTS content available"],
      kind: "assumption",
    })
  );

  const completedCampaigns = campaigns.filter((c) => c.metrics.bookings || c.metrics.revenue);
  if (completedCampaigns.length > 0) {
    const best = completedCampaigns.sort((a, b) => (b.metrics.revenue ?? 0) - (a.metrics.revenue ?? 0))[0];
    predictions.push(
      predict({
        subject: `Repeat: ${best.title}`,
        platform: best.platform,
        expectedEngagement: "Based on historical campaign",
        expectedLeads: best.metrics.leads ?? 2,
        expectedBookings: best.metrics.bookings ?? 1,
        expectedRevenue: best.metrics.revenue ?? avgBookingValue ?? 0,
        expectedRoi: best.metrics.roi ? `${best.metrics.roi}%` : "Unknown",
        probabilityOfSuccess: 0.75,
        confidence: 0.85,
        basis: [`Historical: ${best.metrics.bookings ?? 0} bookings`, `Revenue: $${best.metrics.revenue ?? 0}`],
        assumptions: ["Similar audience and offer", "Same platform and format"],
        kind: "fact",
      })
    );
  }

  predictions.push(
    predict({
      subject: "Monthly revenue forecast (marketing-attributed)",
      expectedEngagement: "N/A",
      expectedLeads: Math.round(metrics.today.leads * 30),
      expectedBookings: Math.round(metrics.month.bookings * (1 + metrics.month.bookingsChange / 100)),
      expectedRevenue: Math.round(metrics.revenue.thisMonth * (1 + Math.max(metrics.revenue.monthChange, -20) / 100)),
      expectedRoi: "Portfolio-wide",
      probabilityOfSuccess: 0.6,
      confidence: 0.65,
      basis: [
        `$${metrics.revenue.thisMonth.toLocaleString()} MTD pipeline`,
        `${metrics.month.bookingsChange}% booking change`,
        `${analytics.totals.conversionRate}% conversion`,
      ],
      assumptions: ["No major seasonality shock", "Consistent marketing cadence"],
    })
  );

  return predictions;
}
