import type { PrioritizedRecommendation } from "../types";
import type { ExecutiveConfidence } from "./types";

export function buildExecutiveConfidence(rec: PrioritizedRecommendation): ExecutiveConfidence {
  const isRevenue = rec.category === "revenue" || rec.category === "sales";
  const truthStatus =
    rec.confidence >= 0.8 && rec.evidence.some((e) => e.includes("Submission") || e.includes("CRM"))
      ? "verified"
      : rec.confidence >= 0.6
        ? "estimated"
        : "predicted";

  return {
    observed: [rec.detail, rec.whyNow],
    evidence: rec.evidence,
    supportingMemories: rec.evidence
      .filter((e) => e.includes("memory") || e.includes("Memory"))
      .map((e, i) => ({ id: `ev-${i}`, title: e, status: "verified" })),
    supportingAnalytics: rec.evidence.filter(
      (e) => !e.toLowerCase().includes("memory") && !e.toLowerCase().includes("heuristic")
    ),
    confidence: rec.confidence,
    businessImpact: rec.detail,
    revenueOpportunity: rec.estimatedRevenue,
    risk: rec.confidence < 0.65 ? "Low confidence — limited outcome history" : "Moderate execution risk",
    dependencies: ["Live business data", "Admin action within 48h"],
    alternatives: isRevenue
      ? ["Defer and focus on delivery", "Marketing campaign instead"]
      : ["Sales follow-up first", "Website conversion test"],
    unknowns:
      rec.confidence < 0.7
        ? ["Historical outcome data thin for this action type", "External attribution not connected"]
        : [],
    expectedOutcome: isRevenue
      ? "Pipeline or booking moved forward within 7 days"
      : "Measurable lift in target metric within 14 days",
    predictionConfidence: Math.round(rec.confidence * 85) / 100,
    whyNow: rec.whyNow,
    whyNotLater:
      rec.priority === "critical"
        ? "Delay compounds revenue leak or client dissatisfaction"
        : "Can schedule after critical pipeline actions",
    truthStatus,
  };
}
