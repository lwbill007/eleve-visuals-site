import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "./business-operator";
import type { FunnelStepMetric, RevenueAttributionFunnel } from "../types";

function step(
  id: string,
  label: string,
  count: number,
  prev: number,
  avgValue: number,
  insight: string
): FunnelStepMetric {
  const conversionFromPrevious = prev > 0 ? Math.round((count / prev) * 1000) / 10 : count > 0 ? 100 : 0;
  const dropOffRate = prev > 0 ? Math.round(((prev - count) / prev) * 1000) / 10 : 0;
  const lost = Math.max(0, prev - count);
  const estimatedRevenueLost = Math.round(lost * (conversionFromPrevious / 100) * avgValue * 0.35);
  return {
    id,
    label,
    count,
    conversionFromPrevious,
    dropOffRate,
    estimatedRevenueLost,
    insight,
  };
}

export async function getRevenueAttributionFunnel(days = 30): Promise<RevenueAttributionFunnel> {
  const since = new Date(Date.now() - days * 86400000);
  const [metrics, analytics, events, bookings, contacts, completed] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(days),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, path: true, metadata: true, sessionId: true },
    }),
    prisma.submission.count({ where: { type: "booking", createdAt: { gte: since } } }),
    prisma.submission.count({ where: { type: "contact", createdAt: { gte: since } } }),
    prisma.submission.count({
      where: { type: "booking", status: "completed", updatedAt: { gte: since } },
    }),
  ]);

  const avgValue =
    metrics.month.bookings > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 1500;

  const visitors = analytics.totals.uniqueSessions || analytics.totals.pageviews;
  const portfolioViews = events.filter(
    (e) => e.type === "pageview" && e.path.startsWith("/portfolio")
  ).length;
  const bookPageViews = events.filter(
    (e) => e.type === "pageview" && (e.path === "/book" || e.path.startsWith("/book"))
  ).length;
  const formStarts = events.filter(
    (e) =>
      e.type === "engagement" &&
      (e.metadata as { event?: string })?.event === "form_step" &&
      (e.metadata as { step?: number })?.step === 1
  ).length;
  const formStartsCount = Math.max(formStarts, bookPageViews, bookings + contacts);

  const consultations = await prisma.submission.count({
    where: {
      type: "booking",
      status: { in: ["contacted", "scheduled", "completed"] },
      createdAt: { gte: since },
    },
  });

  const paidBookings = completed;
  const totalRevenue = metrics.revenue.thisMonth;

  const steps: FunnelStepMetric[] = [
    step("visitors", "Visitors", visitors, visitors, avgValue, "Unique sessions on site"),
    step(
      "portfolio",
      "Portfolio views",
      portfolioViews,
      visitors,
      avgValue,
      portfolioViews < visitors * 0.2
        ? "Low portfolio engagement — homepage may not drive enough discovery"
        : "Portfolio discovery healthy"
    ),
    step(
      "form_starts",
      "Booking/contact starts",
      formStartsCount,
      Math.max(portfolioViews, visitors * 0.3),
      avgValue,
      formStartsCount < bookPageViews * 0.5
        ? "Visitors reach /book but don't start the form — friction at page level"
        : "Form start rate within range"
    ),
    step(
      "submissions",
      "Form submissions",
      bookings + contacts,
      formStartsCount,
      avgValue,
      "Completed inquiry forms"
    ),
    step(
      "consultations",
      "Consultations scheduled",
      consultations,
      bookings + contacts,
      avgValue,
      "Moved past initial inquiry"
    ),
    step("paid", "Paid bookings", paidBookings, consultations, avgValue, "Completed revenue"),
    step("revenue", "Revenue ($)", totalRevenue, paidBookings || 1, avgValue, "Pipeline value MTD"),
  ];

  const leakSteps = steps.filter((s) => s.dropOffRate > 25 && s.id !== "visitors");
  const biggestLeak = leakSteps.sort((a, b) => b.estimatedRevenueLost - a.estimatedRevenueLost)[0] ?? null;
  const totalRecoverable = leakSteps.reduce((s, l) => s + l.estimatedRevenueLost, 0);

  return {
    generatedAt: new Date().toISOString(),
    periodDays: days,
    steps,
    totalRevenue,
    totalRecoverable,
    biggestLeak,
  };
}
