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

export async function getExecutiveOpportunities(): Promise<ExecutiveOpportunity[]> {
  const [insights, metrics] = await Promise.all([
    getProactiveBusinessInsights(),
    getOperatorMetrics(),
  ]);

  const opportunities = insights.map(insightToOpportunity);

  if (metrics.attention.abandonedInquiries > 0) {
    const revenue = metrics.attention.abandonedInquiries * 1200;
    opportunities.unshift({
      id: "abandoned-bookings-recovery",
      title: `Recover ${metrics.attention.abandonedInquiries} abandoned booking inquiries`,
      detail: "Inquiries in new/contacted status untouched for 3+ days. Personalized follow-up typically recovers 15–30% of stale portrait inquiries.",
      why: `Verified from submission timestamps — ${metrics.attention.abandonedInquiries} inquiries past SLA.`,
      category: "revenue",
      expectedRevenue: revenue,
      confidence: 0.78,
      effort: "low",
      urgency: "critical",
      impact: `~$${revenue.toLocaleString()} potential`,
      evidence: [
        `${metrics.attention.abandonedInquiries} stale inquiries in database`,
        "Industry benchmark: 15–30% recovery on timely follow-up",
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
      detail: "Past clients with no activity in 60+ days. Re-activation campaigns cost less than new acquisition.",
      why: `CRM shows $${metrics.attention.followUpValue.toLocaleString()} in recoverable client value.`,
      category: "sales",
      expectedRevenue: metrics.attention.followUpValue,
      confidence: 0.72,
      effort: "medium",
      urgency: "high",
      impact: `$${metrics.attention.followUpValue.toLocaleString()} addressable`,
      evidence: [
        `${metrics.attention.followUpClients} clients inactive 60+ days`,
        "Historical LTV from CRM records",
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
    .sort((a, b) => b.expectedRevenue * b.confidence - a.expectedRevenue * a.confidence)
    .slice(0, 12);
}
