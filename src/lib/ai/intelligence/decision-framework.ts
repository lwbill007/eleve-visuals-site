import type { ExecutiveDecision, ExecutiveOpportunity } from "../types";

export function opportunitiesToDecisions(opportunities: ExecutiveOpportunity[]): ExecutiveDecision[] {
  return opportunities.slice(0, 8).map((opp) => ({
    id: `decision-${opp.id}`,
    title: opp.title,
    recommendation: opp.detail,
    confidence: opp.confidence,
    expectedOutcome: opp.impact,
    evidence: opp.evidence,
    historicalComparison:
      opp.category === "revenue"
        ? "Similar follow-up campaigns historically recover 15–30% of stale portrait inquiries."
        : undefined,
    riskLevel:
      opp.urgency === "critical" ? "high" : opp.urgency === "high" ? "medium" : ("low" as const),
    estimatedRoi: opp.expectedRevenue,
    implementationMinutes: opp.estimatedMinutes,
    alternatives: [
      { label: "Do nothing", tradeoff: `Risk losing ~$${opp.expectedRevenue.toLocaleString()} opportunity` },
      { label: "Delegate/automate", tradeoff: "Lower personalization, faster execution" },
    ],
    actions: opp.actions,
  }));
}
