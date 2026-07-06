import { getOperatorMetrics } from "./business-operator";
import { getExecutiveForecasts } from "./forecasting";
import type { PredictiveInsight } from "../types";

export async function getPredictiveInsights(): Promise<PredictiveInsight[]> {
  const [metrics, forecasts] = await Promise.all([getOperatorMetrics(), getExecutiveForecasts()]);

  const avgValue =
    metrics.month.bookings > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 1500;

  const insights: PredictiveInsight[] = [];

  if (metrics.traffic.trafficChange <= -15) {
    const bookingDrop = Math.round(Math.abs(metrics.traffic.trafficChange) * 0.4);
    const lostBookings = Math.max(1, Math.round((metrics.month.bookings * bookingDrop) / 100));
    insights.push({
      id: "traffic-decline",
      metric: "Bookings",
      trend: `Traffic down ${Math.abs(metrics.traffic.trafficChange)}% week-over-week`,
      prediction: `If this trend continues, bookings may decrease ~${bookingDrop}% over the next 30 days (~${lostBookings} fewer inquiries).`,
      projectedChange: -bookingDrop,
      confidence: 0.72,
      recoveryAction: "Publish 3 portfolio Reels + feature top converter on homepage this week",
      recoveryImpact: `Projected to recover ~${Math.min(lostBookings, 3)} bookings`,
      estimatedRevenue: Math.min(lostBookings, 3) * avgValue,
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
      recoveryImpact: `15–30% recovery rate = ~$${Math.round(metrics.attention.abandonedInquiries * 0.2 * avgValue).toLocaleString()}`,
      estimatedRevenue: Math.round(metrics.attention.abandonedInquiries * 0.2 * avgValue),
    });
  }

  if (metrics.traffic.conversionRate < 2 && metrics.traffic.visitors30 > 50) {
    insights.push({
      id: "conversion-soft",
      metric: "Conversion rate",
      trend: `Site converting at ${metrics.traffic.conversionRate}% (benchmark 2.5–4%)`,
      prediction: "Current friction may cost 1–2 bookings per month if unaddressed.",
      projectedChange: -15,
      confidence: 0.68,
      recoveryAction: "A/B test booking form length + strengthen CTA on top landing page",
      recoveryImpact: "+0.5–1% conversion = ~$1.5–3k/mo",
      estimatedRevenue: 2000,
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
