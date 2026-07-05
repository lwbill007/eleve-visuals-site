import type { ExecutiveForecast } from "../types";
import { getOperatorMetrics } from "./business-operator";
import { getAdminPipeline } from "@/lib/admin-os-server";

export async function getExecutiveForecasts(): Promise<ExecutiveForecast[]> {
  const [metrics, pipeline] = await Promise.all([getOperatorMetrics(), getAdminPipeline()]);

  const revenueGrowth = Math.max(-30, Math.min(40, metrics.revenue.monthChange));
  const bookingGrowth = Math.max(-30, Math.min(40, metrics.month.bookingsChange));
  const confidenceBase = metrics.month.bookings >= 3 ? 0.75 : 0.55;

  const revenuePredicted = Math.round(
    metrics.revenue.thisMonth * (1 + revenueGrowth / 100)
  );
  const revenueVariance = Math.round(metrics.revenue.thisMonth * 0.15);

  const bookingPredicted = Math.round(
    metrics.month.bookings * (1 + bookingGrowth / 100)
  );

  const busySeason =
    metrics.month.bookings > metrics.month.bookings * 0.8
      ? "Current month shows active inquiry volume"
      : "Monitor for seasonal portrait peaks (fall/holiday)";

  return [
    {
      metric: "revenue",
      label: "Revenue (30-day)",
      current: metrics.revenue.thisMonth,
      predicted: revenuePredicted,
      low: Math.max(0, revenuePredicted - revenueVariance),
      high: revenuePredicted + revenueVariance,
      confidence: confidenceBase,
      horizon: "30 days",
      why: `Based on ${metrics.revenue.monthChange >= 0 ? "positive" : "negative"} pipeline trend and $${pipeline.totalValue.toLocaleString()} open pipeline.`,
      assumptions: [
        "Pipeline conversion rate holds steady",
        "No major pricing changes",
        `${pipeline.columns.flatMap((c) => c.items).length} active pipeline items`,
      ],
      unknowns: ["Seasonal demand shifts", "Unclosed inquiry conversion rate"],
    },
    {
      metric: "bookings",
      label: "Booking inquiries",
      current: metrics.month.bookings,
      predicted: bookingPredicted,
      low: Math.max(0, bookingPredicted - 2),
      high: bookingPredicted + 3,
      confidence: confidenceBase - 0.05,
      horizon: "30 days",
      why: `Month-to-date ${metrics.month.bookings} inquiries (${metrics.month.bookingsChange >= 0 ? "+" : ""}${metrics.month.bookingsChange}%).`,
      assumptions: ["Marketing cadence unchanged", "Website traffic stable"],
      unknowns: ["Campaign launches", "Referral spikes"],
    },
    {
      metric: "pipeline",
      label: "Pipeline value",
      current: pipeline.totalValue,
      predicted: Math.round(pipeline.totalValue * (1 + revenueGrowth / 200)),
      low: Math.round(pipeline.totalValue * 0.85),
      high: Math.round(pipeline.totalValue * 1.2),
      confidence: 0.7,
      horizon: "60 days",
      why: "Weighted from open pipeline stages and historical close patterns.",
      assumptions: ["Stale inquiries addressed within 7 days"],
      unknowns: ["Large deal timing"],
    },
    {
      metric: "demand",
      label: "Demand seasonality",
      current: metrics.month.bookings,
      predicted: bookingPredicted,
      low: bookingPredicted - 1,
      high: bookingPredicted + 4,
      confidence: 0.5,
      horizon: "90 days",
      why: busySeason,
      assumptions: ["Portrait demand follows prior year patterns"],
      unknowns: ["New session volume launches", "Market conditions"],
    },
    {
      metric: "churn",
      label: "Client churn risk",
      current: metrics.attention.followUpClients,
      predicted: Math.round(metrics.attention.followUpClients * 1.1),
      low: metrics.attention.followUpClients,
      high: Math.round(metrics.attention.followUpClients * 1.3),
      confidence: 0.65,
      horizon: "60 days",
      why: `${metrics.attention.followUpClients} clients already inactive 60+ days without re-engagement.`,
      assumptions: ["No re-engagement campaign launched"],
      unknowns: ["VIP outreach effectiveness"],
    },
    {
      metric: "conversion",
      label: "Marketing conversion",
      current: metrics.traffic.conversionRate,
      predicted: Math.round((metrics.traffic.conversionRate + metrics.traffic.conversionChange / 10) * 10) / 10,
      low: Math.max(0, metrics.traffic.conversionRate - 0.5),
      high: metrics.traffic.conversionRate + 0.8,
      confidence: 0.6,
      horizon: "30 days",
      why: `Current ${metrics.traffic.conversionRate}% with ${metrics.traffic.conversionChange >= 0 ? "improving" : "softening"} week trend.`,
      assumptions: ["Top landing page unchanged"],
      unknowns: ["Homepage/portfolio updates", "Ad traffic quality"],
    },
  ];
}
