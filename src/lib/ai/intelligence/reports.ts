import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminDashboardOS, getAdminInsights, getAdminCRMContacts, getSponsorMetrics } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";
import type { AIReportType, AIReportResult } from "../types";

export async function generateBusinessReport(type: AIReportType): Promise<AIReportResult> {
  const days = type === "monthly" ? 30 : type === "quarterly" ? 90 : type === "yearly" ? 365 : 30;

  const [dashboard, analytics, insights, crm, sponsor, submissions] = await Promise.all([
    getAdminDashboardOS(),
    getAnalyticsSummary(days),
    getAdminInsights(),
    getAdminCRMContacts(),
    type === "sponsor" ? getSponsorMetrics() : Promise.resolve(null),
    prisma.submission.groupBy({
      by: ["type"],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - days * 86400000) } },
    }),
  ]);

  const dataContext = {
    reportType: type,
    periodDays: days,
    metrics: dashboard.metrics,
    analytics: analytics.totals,
    topPages: analytics.topPages.slice(0, 10),
    topSources: analytics.topSources.slice(0, 8),
    insights: insights.insights,
    crmSummary: {
      totalContacts: crm.length,
      vip: crm.filter((c) => c.status === "vip").length,
      inactive: crm.filter((c) => {
        const d = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
        return d > 90;
      }).length,
      totalRevenue: crm.reduce((s, c) => s + c.revenue, 0),
    },
    submissions: submissions.map((s) => ({ type: s.type, count: s._count })),
    sponsor,
  };

  const promptMap: Record<AIReportType, string> = {
    monthly: "Write a comprehensive monthly business report for ÉLEVÉ Visuals. Include revenue, bookings, marketing, sessions, and next month priorities.",
    quarterly: "Write a quarterly business review with trends, wins, challenges, and strategic recommendations.",
    yearly: "Write an annual business summary with growth narrative and vision for next year.",
    sponsor: "Write a sponsor-ready report highlighting audience, engagement, growth, and brand alignment.",
    marketing: "Write a marketing performance report with channel analysis and campaign recommendations.",
    revenue: "Write a revenue analysis with forecast, pipeline health, and pricing recommendations.",
    growth: "Write a growth forecast report with opportunities and risks.",
  };

  const result = await generateAIContent({
    task: "general",
    prompt: promptMap[type],
    context: dataContext,
  });

  return {
    type,
    generatedAt: new Date().toISOString(),
    provider: result.provider,
    content: result.content,
    data: dataContext,
  };
}
