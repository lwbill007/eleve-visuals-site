import type { ExecutiveScore } from "../types";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { computeExecutiveScores } from "../intelligence/executive-scores";

type OperatorMetrics = Awaited<ReturnType<typeof getOperatorMetrics>>;

function score(
  key: string,
  label: string,
  value: number,
  change: number,
  why: string,
  evidence: string[],
  confidence: number
): ExecutiveScore {
  return {
    key,
    label,
    value: Math.min(100, Math.max(0, Math.round(value))),
    change: Math.round(change),
    trend: change > 2 ? "up" : change < -2 ? "down" : "flat",
    why,
    evidence,
    dataSources: ["Analytics", "CRM", "Pipeline", "Marketing Memory"],
    confidence,
  };
}

export async function computeCMOScores(metrics?: OperatorMetrics): Promise<ExecutiveScore[]> {
  const [m, analytics] = await Promise.all([
    metrics ?? getOperatorMetrics(),
    getAnalyticsSummary(30),
  ]);

  const executive = computeExecutiveScores(m);
  const getExec = (key: string) => executive.find((s) => s.key === key);

  const seoScore = Math.min(
    100,
    Math.max(
      30,
      Math.round(
        50 +
          (analytics.topPages.some((p) => p.path === "/") ? 10 : 0) +
          (analytics.topPages.some((p) => p.path.startsWith("/portfolio")) ? 15 : 0) +
          Math.min(20, analytics.totals.pageviews / 50)
      )
    )
  );

  const conversionScore = Math.min(100, Math.max(10, Math.round(m.traffic.conversionRate * 12)));

  const bookingScore = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        40 +
          Math.min(30, m.month.bookings * 3) +
          (m.month.bookingsChange >= 0 ? 15 : -10) -
          m.attention.abandonedInquiries * 4
      )
    )
  );

  return [
    getExec("businessHealth")!,
    getExec("marketing")!,
    score(
      "growth",
      "Growth",
      Math.round((getExec("marketing")!.value + getExec("revenue")!.value) / 2),
      m.traffic.trafficChange,
      m.traffic.trafficChange >= 0
        ? `Traffic growing ${m.traffic.trafficChange}% — bookings ${m.month.bookingsChange >= 0 ? "up" : "down"} ${Math.abs(m.month.bookingsChange)}%`
        : `Traffic declined — focus on top channel and conversion optimization`,
      [`${m.traffic.visitors30} visitors`, `${m.month.bookings} bookings/mo`],
      0.78
    ),
    getExec("brand")!,
    getExec("revenue")!,
    score(
      "booking",
      "Booking",
      bookingScore,
      m.month.bookingsChange,
      m.attention.abandonedInquiries > 0
        ? `${m.attention.abandonedInquiries} stale inquiries dragging booking score`
        : `${m.today.bookings} new bookings today — pipeline healthy`,
      [`${m.month.bookings} bookings MTD`, `${m.attention.abandonedInquiries} stale`],
      0.86
    ),
    score(
      "seo",
      "SEO",
      seoScore,
      0,
      `Organic discovery via portfolio pages and homepage — ${analytics.totals.pageviews} pageviews tracked`,
      analytics.topPages.slice(0, 3).map((p) => `${p.path}: ${p.views} views`),
      0.7
    ),
    score(
      "conversion",
      "Conversion",
      conversionScore,
      m.traffic.conversionChange,
      `${m.traffic.conversionRate}% site conversion — top page ${m.traffic.topPage}`,
      [`${m.traffic.conversionRate}% rate`, `${m.traffic.conversionChange >= 0 ? "+" : ""}${m.traffic.conversionChange}% change`],
      0.84
    ),
    getExec("clientExperience")!,
  ];
}
