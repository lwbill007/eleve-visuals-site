import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminCRMContacts, getAdminPipeline } from "@/lib/admin-os-server";
import { getBookingIntelligence } from "../intelligence/bookings";
import { getStoredPatterns } from "../marketing/learning-engine";
import { getLearningOutcomes } from "../memory/learning";
import type { DecisionEngineContext } from "./types";

export async function buildDecisionEngineContext(query?: string): Promise<DecisionEngineContext> {
  const workspaceId = getWorkspaceId();

  const [metrics, analytics, pipeline, crm, bookings, patterns, learnings, memorySearch] =
    await Promise.all([
      getOperatorMetrics(),
      getAnalyticsSummary(30),
      getAdminPipeline(),
      getAdminCRMContacts(),
      getBookingIntelligence(),
      getStoredPatterns(5),
      getLearningOutcomes(undefined, 5),
      query
        ? searchMemories({ workspaceId, limit: 8 }).then(async (r) => {
            const q = query.toLowerCase();
            return {
              items: r.items.filter(
                (m) =>
                  m.title.toLowerCase().includes(q) ||
                  m.summary.toLowerCase().includes(q) ||
                  m.tags.some((t) => t.includes(q))
              ),
              total: r.total,
            };
          })
        : searchMemories({ workspaceId, limit: 8 }),
    ]);

  const facts: string[] = [
    `Revenue MTD: $${metrics.revenue.thisMonth.toLocaleString()} (${metrics.revenue.monthChange >= 0 ? "+" : ""}${metrics.revenue.monthChange}%)`,
    `Bookings this month: ${metrics.month.bookings}`,
    `Pipeline: $${pipeline.totalValue.toLocaleString()}`,
    `Traffic: ${metrics.traffic.visitors30} visitors · ${metrics.traffic.conversionRate}% conversion`,
    `CRM: ${crm.length} contacts · ${metrics.attention.followUpClients} need follow-up`,
    `Stale inquiries: ${bookings.staleInquiries}`,
    `Top page: ${analytics.topPages[0]?.path ?? "/"} (${analytics.topPages[0]?.views ?? 0} views)`,
  ];

  const predictions: string[] = [
    `30-day revenue forecast: ~$${Math.round(metrics.revenue.thisMonth * (1 + Math.max(metrics.revenue.monthChange, -20) / 100)).toLocaleString()}`,
    `Recovery potential from inactive clients: ~$${metrics.attention.followUpValue.toLocaleString()}`,
    ...patterns.slice(0, 2).map((p) => `Pattern: ${p.pattern}`),
  ];

  const suggestions: string[] = [
    ...(metrics.attention.abandonedInquiries > 0
      ? [`Recover ${metrics.attention.abandonedInquiries} stale booking inquiries today`]
      : []),
    ...(metrics.attention.galleriesAwaiting > 0
      ? [`Deliver ${metrics.attention.galleriesAwaiting} pending galleries`]
      : []),
  ];

  const inferences: string[] = learnings.map(
    (l) => `${l.domain}: ${l.hypothesis || l.actionType} → ${l.outcome}`
  );

  const unknowns: string[] = [
    "External ad spend ROI (not connected)",
    "Offline referral attribution",
    "Unlogged client conversations",
  ];

  const memoryHits = memorySearch.items.length;
  const metricsSummary = facts.join(" · ");

  const whyPreamble = [
    "Before recommending anything, ÉLEVÉ AI checked:",
    `• ${memoryHits} relevant memories`,
    "• Live business metrics & pipeline",
    "• CRM & booking intelligence",
    "• Marketing patterns & learning outcomes",
    "• Website analytics (30d)",
    "",
    "Every recommendation must cite evidence. Facts vs predictions vs suggestions are labeled.",
  ].join("\n");

  return {
    checkedAt: new Date().toISOString(),
    memoryHits,
    sources: [
      "AIMemory",
      "Submissions & Pipeline",
      "Analytics",
      "CRM",
      "Booking intelligence",
      "Marketing patterns",
      "AILearningOutcome",
    ],
    facts,
    predictions,
    suggestions,
    inferences,
    unknowns,
    metricsSummary,
    whyPreamble,
  };
}

export function formatDecisionContextForPrompt(ctx: DecisionEngineContext): string {
  return [
    ctx.whyPreamble,
    "",
    "FACTS:",
    ...ctx.facts.map((f) => `- ${f}`),
    "",
    "PREDICTIONS:",
    ...ctx.predictions.map((p) => `- ${p}`),
    "",
    "SUGGESTIONS:",
    ...ctx.suggestions.map((s) => `- ${s}`),
    "",
    "INFERENCES FROM LEARNING:",
    ...(ctx.inferences.length ? ctx.inferences.map((i) => `- ${i}`) : ["- None recorded yet"]),
    "",
    "UNKNOWN / NOT TRACKED:",
    ...ctx.unknowns.map((u) => `- ${u}`),
  ].join("\n");
}
