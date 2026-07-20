import { getOperatorMetrics } from "./business-operator";
import { getExecutiveForecasts } from "./forecasting";
import type { PredictiveInsight } from "../types";

export async function getPredictiveInsights(): Promise<PredictiveInsight[]> {
  const [metrics, forecasts] = await Promise.all([getOperatorMetrics(), getExecutiveForecasts()]);

  const avgValue =
    metrics.month.bookings > 0 && metrics.revenue.thisMonth > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 0;

  const insights: PredictiveInsight[] = [];

  if (metrics.traffic.trafficChange <= -15) {
    const bookingDrop = Math.round(Math.abs(metrics.traffic.trafficChange) * 0.4);
    const lostBookings =
      metrics.month.bookings > 0
        ? Math.max(0, Math.round((metrics.month.bookings * bookingDrop) / 100))
        : 0;
    insights.push({
      id: "traffic-decline",
      metric: "Bookings",
      trend: `Traffic down ${Math.abs(metrics.traffic.trafficChange)}% week-over-week`,
      prediction:
        lostBookings > 0
          ? `If this trend continues, bookings may decrease ~${bookingDrop}% over the next 30 days (~${lostBookings} fewer inquiries).`
          : `Traffic is down ${Math.abs(metrics.traffic.trafficChange)}% WoW (Measured). Booking impact Unknown — no MTD booking base.`,
      projectedChange: -bookingDrop,
      confidence: metrics.month.bookings > 0 ? 0.72 : 0.4,
      recoveryAction: "Publish 3 portfolio Reels + feature top converter on homepage this week",
      recoveryImpact:
        avgValue > 0 && lostBookings > 0
          ? `Projected to recover ~${Math.min(lostBookings, 3)} bookings`
          : "Dollar recovery Unknown — no measured ASP",
      estimatedRevenue: avgValue > 0 ? Math.min(lostBookings, 3) * avgValue : 0,
    });
  }

  if (metrics.attention.abandonedInquiries > 0) {
    insights.push({
      id: "stale-inquiries",
      metric: "Pipeline recovery",
      trend: `${metrics.attention.abandonedInquiries} inquiries going stale`,
      prediction: `Without follow-up, ~${Math.round(metrics.attention.abandonedInquiries * 0.7)} will likely go cold within 7 days.`,
      projectedChange: -metrics.attention.abandonedInquiries,
      confidence: 0.85,
      recoveryAction: "Send personalized 24h + 72h follow-up sequence today",
      recoveryImpact:
        avgValue > 0
          ? `15–30% recovery rate = ~$${Math.round(metrics.attention.abandonedInquiries * 0.2 * avgValue).toLocaleString()} (Estimated from measured ASP)`
          : "Dollar recovery Unknown — no measured ASP",
      estimatedRevenue:
        avgValue > 0 ? Math.round(metrics.attention.abandonedInquiries * 0.2 * avgValue) : 0,
    });
  }

  if (metrics.traffic.conversionRate < 2 && metrics.traffic.visitors30 > 50) {
    insights.push({
      id: "conversion-soft",
      metric: "Conversion rate",
      trend: `Site converting at ${metrics.traffic.conversionRate}% (Measured)`,
      prediction: "Current friction may suppress inquiry volume if unaddressed. Dollar impact Unknown without measured ASP.",
      projectedChange: -15,
      confidence: 0.55,
      recoveryAction: "A/B test booking form length + strengthen CTA on top landing page",
      recoveryImpact: "Conversion lift Unknown in $ until ASP is measured",
      estimatedRevenue: 0,
    });
  }

  const revenueForecast = forecasts.find((f) => f.metric === "revenue");
  if (revenueForecast && revenueForecast.predicted < revenueForecast.current) {
    insights.push({
      id: "revenue-forecast",
      metric: "Revenue",
      trend: `Pipeline trending ${metrics.revenue.monthChange >= 0 ? "flat" : "down"}`,
      prediction: `30-day revenue forecast: $${revenueForecast.predicted.toLocaleString()} (${Math.round(revenueForecast.confidence * 100)}% confidence).`,
      projectedChange: metrics.revenue.monthChange,
      confidence: revenueForecast.confidence,
      recoveryAction: "Prioritize highest-ROI recovery actions from executive opportunities",
      recoveryImpact: revenueForecast.why,
      estimatedRevenue: Math.max(0, revenueForecast.current - revenueForecast.predicted),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady-growth",
      metric: "Business health",
      trend: "Metrics within normal range",
      prediction: `Maintaining ${metrics.month.bookings} bookings/month at $${avgValue.toLocaleString()} APV projects ~$${metrics.revenue.thisMonth.toLocaleString()} MTD.`,
      projectedChange: metrics.revenue.monthChange,
      confidence: 0.65,
      recoveryAction: "Invest in top traffic source content to accelerate growth",
      recoveryImpact: "Compound portfolio + Instagram momentum",
      estimatedRevenue: Math.round(avgValue * 1.5),
    });
  }

  return insights.sort((a, b) => b.estimatedRevenue * b.confidence - a.estimatedRevenue * a.confidence);
}
