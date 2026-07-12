import type { ExecutiveOpportunity } from "../types";
import { getProactiveBusinessInsights, getOperatorMetrics, OS_ROUTES } from "./business-operator";
import type { BusinessInsight } from "../types";

function effortFromSeverity(severity: string): ExecutiveOpportunity["effort"] {
  if (severity === "high") return "medium";
  if (severity === "low") return "low";
  return "medium";
}

function urgencyFromSeverity(severity: string, revenue: number): ExecutiveOpportunity["urgency"] {
  if (severity === "high" && revenue >= 2000) return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function insightToOpportunity(insight: BusinessInsight): ExecutiveOpportunity {
  const expectedRevenue = insight.revenueImpact ?? 0;
  return {
    id: insight.id,
    title: insight.title,
    detail: insight.detail,
    why: insight.why,
    category:
      insight.category === "crm"
        ? "sales"
        : insight.category === "operations"
          ? "operations"
          : insight.category === "sessions"
            ? "sessions"
            : insight.category,
    expectedRevenue,
    confidence: insight.severity === "high" ? 0.82 : insight.severity === "medium" ? 0.7 : 0.6,
    effort: effortFromSeverity(insight.severity),
    urgency: urgencyFromSeverity(insight.severity, expectedRevenue),
    impact: insight.metric ?? "Measurable pipeline impact",
    evidence: [insight.detail, insight.why, insight.metric ? `Metric: ${insight.metric}` : ""].filter(Boolean),
    actions: insight.actions,
    estimatedMinutes: insight.timeSavedMinutes ?? 30,
  };
}

function opportunityScore(o: ExecutiveOpportunity): number {
  const revenueWeight = o.expectedRevenue > 0 ? o.expectedRevenue * o.confidence : 0;
  const urgencyBonus =
    o.urgency === "critical" ? 5000 : o.urgency === "high" ? 2000 : o.urgency === "medium" ? 500 : 0;
  return revenueWeight + urgencyBonus;
}

export async function getExecutiveOpportunities(): Promise<ExecutiveOpportunity[]> {
  const [insights, metrics] = await Promise.all([
    getProactiveBusinessInsights(),
    getOperatorMetrics(),
  ]);

  const opportunities = insights.map(insightToOpportunity);

  if (metrics.attention.abandonedInquiries > 0) {
    opportunities.unshift({
      id: "abandoned-bookings-recovery",
      title: `Recover ${metrics.attention.abandonedInquiries} abandoned booking inquiries`,
      detail:
        "Inquiries in new/contacted status untouched for 3+ days. Dollar recovery is unknown without studio-specific close history — do not invent ROI.",
      why: `Verified from submission timestamps — ${metrics.attention.abandonedInquiries} inquiries past SLA (Measured).`,
      category: "revenue",
      expectedRevenue: 0,
      confidence: 0.78,
      effort: "low",
      urgency: "critical",
      impact: `${metrics.attention.abandonedInquiries} stale inquiries · More financial data required for $ recovery`,
      evidence: [
        `${metrics.attention.abandonedInquiries} stale inquiries in database (Measured)`,
        "Unknown: studio recovery rate after follow-up — Industry Best Practice ranges are not ÉLEVÉ facts",
      ],
      actions: [
        {
          id: "draft-abandoned",
          label: "Draft follow-up emails",
          type: "email_clients",
          href: OS_ROUTES.marketingFollowUp,
          task: "follow_up",
          prompt: "Re-engage abandoned portrait booking inquiries",
        },
        {
          id: "view-bookings",
          label: "Review inquiries",
          type: "navigate",
          href: "/admin/submissions?type=booking",
        },
      ],
      estimatedMinutes: 25,
    });
  }

  if (metrics.attention.followUpClients > 0) {
    opportunities.push({
      id: "inactive-client-reactivation",
      title: `Re-engage ${metrics.attention.followUpClients} inactive clients`,
      detail:
        "Past clients with no activity in 60+ days. Historical CRM value is not the same as recoverable revenue.",
      why: `CRM shows ${metrics.attention.followUpClients} inactive clients (Measured). Recovery $ unknown.`,
      category: "sales",
      expectedRevenue: 0,
      confidence: 0.72,
      effort: "medium",
      urgency: "high",
      impact:
        metrics.attention.followUpValue > 0
          ? `Historical CRM association ~$${metrics.attention.followUpValue.toLocaleString()} · recovery: More financial data required`
          : "More financial data required",
      evidence: [
        `${metrics.attention.followUpClients} clients inactive 60+ days (Measured)`,
        "Do not treat historical LTV as predicted recovery",
      ],
      actions: [
        {
          id: "crm-reengage",
          label: "Open CRM",
          type: "open_crm",
          href: "/admin/crm",
        },
        {
          id: "campaign-reengage",
          label: "Create re-engagement campaign",
          type: "create_campaign",
          href: OS_ROUTES.marketingFollowUp,
          task: "follow_up",
        },
      ],
      estimatedMinutes: 45,
    });
  }

  return opportunities
    .filter((o) => o.expectedRevenue > 0 || o.urgency === "critical" || o.urgency === "high" || o.urgency === "medium")
    .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 12);
}
