import { getOperatorMetrics, getProactiveBusinessInsights } from "../../intelligence/business-operator";
import { getExecutiveRisks } from "../../intelligence/risk-center";
import { getExecutiveOpportunities } from "../../intelligence/opportunity-engine";
import { computeExecutiveScores } from "../../intelligence/executive-scores";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildCEOBrief(): Promise<ExecutiveRoleBrief> {
  const [metrics, insights, risks, opportunities] = await Promise.all([
    getOperatorMetrics(),
    getProactiveBusinessInsights(),
    getExecutiveRisks(),
    getExecutiveOpportunities(),
  ]);

  const scores = computeExecutiveScores(metrics);
  const health = scores.find((s) => s.key === "businessHealth")?.value ?? 50;
  const topRisk = risks[0];
  const topOpp = opportunities[0];
  const topInsight = insights[0];

  return {
    id: "ceo",
    title: ROLE_META.ceo.title,
    mission: ROLE_META.ceo.mission,
    healthScore: health,
    confidence: 0.88,
    topPriority:
      topInsight?.title ??
      (metrics.attention.abandonedInquiries > 0
        ? `Recover ${metrics.attention.abandonedInquiries} stale inquiries`
        : `Grow pipeline — $${metrics.revenue.thisMonth.toLocaleString()} MTD`),
    insights: [
      {
        text: `$${metrics.revenue.thisMonth.toLocaleString()} revenue MTD (${metrics.revenue.monthChange >= 0 ? "+" : ""}${metrics.revenue.monthChange}%)`,
        kind: "fact",
        evidence: [`Pipeline $${metrics.revenue.pipeline.toLocaleString()}`],
      },
      {
        text: `${metrics.month.bookings} bookings this month · ${metrics.traffic.conversionRate}% conversion`,
        kind: "fact",
        evidence: [`${metrics.traffic.visitors30} visitors (30d)`],
      },
      topRisk
        ? { text: `Risk: ${topRisk.title}`, kind: "inference", evidence: topRisk.evidence }
        : { text: "No elevated risks detected", kind: "fact" },
      {
        text: `Projected monthly revenue ~$${Math.round(metrics.revenue.thisMonth * (1 + Math.max(metrics.revenue.monthChange, -20) / 100)).toLocaleString()}`,
        kind: "prediction",
        evidence: ["Based on MTD pipeline trend"],
      },
    ],
    recommendations: [
      ...(topOpp
        ? [
            {
              id: topOpp.id,
              title: topOpp.title,
              detail: topOpp.detail,
              why: topOpp.why,
              kind: "suggestion" as const,
              confidence: topOpp.confidence,
              expectedImpact: `~$${topOpp.expectedRevenue.toLocaleString()}`,
              actions: topOpp.actions,
            },
          ]
        : []),
    ],
    metrics: [
      { label: "Revenue MTD", value: `$${metrics.revenue.thisMonth.toLocaleString()}`, source: "Pipeline" },
      { label: "Bookings", value: String(metrics.month.bookings), source: "Submissions" },
      { label: "Pipeline", value: `$${metrics.revenue.pipeline.toLocaleString()}`, source: "Pipeline" },
      { label: "Tasks", value: String(metrics.attention.tasks), source: "Dashboard" },
    ],
    href: ROLE_META.ceo.href,
  };
}
