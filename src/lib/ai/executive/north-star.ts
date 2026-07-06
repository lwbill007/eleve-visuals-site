import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminCRMContacts, getAdminPipeline } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";

export interface NorthStarMetrics {
  generatedAt: string;
  confidence: number;
  qualifiedInquiries: number;
  qualifiedInquiriesChange: number;
  bookingFormCompletionRate: number;
  consultationCloseRate: number;
  averageProjectValue: number;
  monthlyRecurringClients: number;
  revenueByTrafficSource: { source: string; revenue: number; visits: number }[];
  portfolioViewsToInquiries: number;
  customerLifetimeValue: number;
  revenuePerVisitor: number;
  customerAcquisitionCost: number;
  leadConversionRate: number;
  bookingConversionRate: number;
  repeatClientRate: number;
  referralRate: number;
  salesVelocityDays: number;
  pipelineHealth: number;
  growthRate: number;
}

export async function computeNorthStarMetrics(): Promise<NorthStarMetrics> {
  const [metrics, analytics, crm, pipeline] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getAdminCRMContacts(),
    getAdminPipeline(),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [qualifiedLeads, bookings, portfolioViews] = await Promise.all([
    prisma.submission.count({
      where: {
        type: { in: ["booking", "contact", "inquiry"] },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.submission.count({
      where: { type: "booking", createdAt: { gte: monthStart } },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: "pageview",
        path: { startsWith: "/portfolio" },
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
  ]);

  const avgProjectValue =
    metrics.month.bookings > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : Math.round(pipeline.totalValue / Math.max(pipeline.columns.flatMap((c) => c.items).length, 1));

  const repeatClients = crm.filter((c) => c.status === "repeat" || c.status === "vip").length;
  const repeatClientRate = crm.length > 0 ? Math.round((repeatClients / crm.length) * 100) : 0;

  const referralClients = crm.filter((c) => c.tags?.includes("referral")).length;
  const referralRate = crm.length > 0 ? Math.round((referralClients / crm.length) * 100) : 0;

  const completedCol = pipeline.columns.find((c) => c.id === "completed");
  const closedDeals = completedCol?.items.length ?? 0;
  const totalPipelineItems = pipeline.columns.flatMap((c) => c.items).filter((i) => i).length;
  const consultationCloseRate =
    totalPipelineItems > 0 ? Math.round((closedDeals / totalPipelineItems) * 100) : 0;

  const portfolioInquiries = await prisma.submission.count({
    where: {
      type: "booking",
      createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      data: { contains: "portfolio" },
    },
  }).catch(() => 0);

  const portfolioViewsToInquiries =
    portfolioViews > 0 ? Math.round((portfolioInquiries / portfolioViews) * 1000) / 10 : 0;

  const revenuePerVisitor =
    metrics.traffic.visitors30 > 0
      ? Math.round((metrics.revenue.thisMonth / metrics.traffic.visitors30) * 100) / 100
      : 0;

  const revenueByTrafficSource = analytics.topSources.slice(0, 8).map((s) => ({
    source: s.source,
    visits: s.visits,
    revenue: Math.round(s.visits * (analytics.totals.conversionRate / 100) * avgProjectValue),
  }));

  const ltv =
    crm.length > 0
      ? Math.round(crm.reduce((sum, c) => sum + c.revenue, 0) / crm.length)
      : avgProjectValue * 1.4;

  const bookingStarts = await prisma.submission.count({
    where: { type: "booking", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
  }).catch(() => bookings);

  const bookingFormCompletionRate =
    qualifiedLeads > 0 ? Math.round((bookingStarts / qualifiedLeads) * 100) : metrics.traffic.conversionRate;

  const dataPoints = [
    metrics.revenue.thisMonth > 0,
    metrics.traffic.visitors30 > 10,
    crm.length > 0,
    analytics.totals.pageviews > 0,
  ].filter(Boolean).length;

  return {
    generatedAt: new Date().toISOString(),
    confidence: Math.round((dataPoints / 4) * 100) / 100,
    qualifiedInquiries: qualifiedLeads,
    qualifiedInquiriesChange: metrics.month.bookingsChange,
    bookingFormCompletionRate,
    consultationCloseRate,
    averageProjectValue: avgProjectValue,
    monthlyRecurringClients: repeatClients,
    revenueByTrafficSource,
    portfolioViewsToInquiries,
    customerLifetimeValue: ltv,
    revenuePerVisitor,
    customerAcquisitionCost: 0,
    leadConversionRate: metrics.traffic.conversionRate,
    bookingConversionRate: bookingFormCompletionRate,
    repeatClientRate,
    referralRate,
    salesVelocityDays: 21,
    pipelineHealth: Math.min(100, Math.round((pipeline.totalValue / 50000) * 100)),
    growthRate: metrics.revenue.monthChange,
  };
}

export function formatNorthStarForPrompt(ns: NorthStarMetrics): string {
  return [
    "NORTH STAR METRICS (optimize all recommendations around these):",
    `• Qualified inquiries (MTD): ${ns.qualifiedInquiries} (${ns.qualifiedInquiriesChange >= 0 ? "+" : ""}${ns.qualifiedInquiriesChange}%)`,
    `• Booking form completion: ${ns.bookingFormCompletionRate}%`,
    `• Consultation close rate: ${ns.consultationCloseRate}%`,
    `• Average project value: $${ns.averageProjectValue.toLocaleString()}`,
    `• Monthly recurring clients: ${ns.monthlyRecurringClients}`,
    `• Revenue per visitor: $${ns.revenuePerVisitor}`,
    `• Customer LTV: $${ns.customerLifetimeValue.toLocaleString()}`,
    `• Repeat client rate: ${ns.repeatClientRate}%`,
    `• Portfolio views → inquiries: ${ns.portfolioViewsToInquiries}%`,
    `• Growth rate (revenue): ${ns.growthRate >= 0 ? "+" : ""}${ns.growthRate}%`,
    `• Top traffic source: ${ns.revenueByTrafficSource[0]?.source ?? "direct"} ($${ns.revenueByTrafficSource[0]?.revenue.toLocaleString() ?? 0} est.)`,
  ].join("\n");
}
