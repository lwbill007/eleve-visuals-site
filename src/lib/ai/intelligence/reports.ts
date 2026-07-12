import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminDashboardOS, getAdminInsights, getAdminCRMContacts, getSponsorMetrics } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";
import type { AIReportType, AIReportResult } from "../types";
import { buildExecutiveReportV2 } from "../platform/build-executive-report-v2";
import { charterSystemPrompt } from "../executive/charter";

export async function generateBusinessReport(type: AIReportType): Promise<AIReportResult> {
  const days = type === "monthly" ? 30 : type === "quarterly" ? 90 : type === "yearly" ? 365 : 30;

  const [dashboard, analytics, insights, crm, sponsor, submissions, reportV2] = await Promise.all([
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
    buildExecutiveReportV2(`bi_${type}`).catch(() => null),
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
    reportV2Summary: reportV2
      ? {
          executiveSummary: reportV2.executiveSummary,
          confidenceOverall: reportV2.confidence.overall,
          topRecommendations: reportV2.recommendations.slice(0, 5).map((r) => ({
            title: r.title,
            priority: r.priority,
            confidence: r.confidence,
            evidenceKinds: r.evidence.map((e) => e.kind),
          })),
        }
      : null,
  };

  const promptMap: Record<AIReportType, string> = {
    monthly:
      "Write a monthly business report for ÉLEVÉ Visuals. Structure: Executive Summary (≤5 sentences), Measured Situation, AI Analysis (labeled), Risks, Recommendations with evidence. Use only provided numbers.",
    quarterly:
      "Write a quarterly business review. Separate Measured Data from AI Analysis and Predictions. Include trends only when supported by context numbers.",
    yearly:
      "Write an annual business summary. Never invent growth percentages or benchmarks. Label unknowns clearly.",
    sponsor:
      "Write a sponsor-ready draft highlighting audience and engagement from provided metrics only. Mark estimates. Do not invent reach or CPM.",
    marketing:
      "Write a marketing performance report from provided analytics. Label AI recommendations separately from measured traffic/conversion.",
    revenue:
      "Write a revenue analysis. Pipeline figures may be estimates — say so. Do not invent ROI or close rates.",
    growth:
      "Write a growth outlook. Any forward-looking statement must be labeled AI Prediction. No fabricated benchmarks.",
  };

  const result = await generateAIContent({
    task: "general",
    prompt: `${charterSystemPrompt()}\n\n${promptMap[type]}\n\nNever fabricate analytics, ROI, conversion lifts, revenue projections, client outcomes, industry benchmarks, or research. If missing, write "Not enough data available."`,
    context: dataContext,
  });

  return {
    type,
    generatedAt: new Date().toISOString(),
    provider: result.provider,
    content: result.content,
    data: dataContext,
    ...(reportV2 ? { reportV2 } : {}),
  };
}
