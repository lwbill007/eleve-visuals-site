import { buildDecisionEngineContext } from "../executive/decision-engine";
import { getExecutiveForecasts } from "../intelligence/forecasting";
import { getPrioritizedRecommendations } from "../intelligence/executive-prioritization";
import { getBusinessDNA } from "./business-dna";
import type { ExecutiveReasoning } from "./types";

export async function buildExecutiveReasoning(): Promise<ExecutiveReasoning> {
  const [context, forecasts, recs, dna] = await Promise.all([
    buildDecisionEngineContext(),
    getExecutiveForecasts(),
    getPrioritizedRecommendations(1),
    getBusinessDNA(),
  ]);

  const topRec = recs[0];

  return {
    observed: context.facts,
    learned: context.inferences,
    compared: [
      `North star metrics vs prior period`,
      `Business DNA alignment: ${dna.luxuryPositioning.slice(0, 80)}…`,
    ],
    verified: context.facts.filter((f) => f.includes("$") || f.includes("Bookings")),
    predicted: forecasts.slice(0, 3).map((f) => `${f.label}: ${f.predicted} (${f.confidence * 100}% conf)`),
    concluded: topRec
      ? `${topRec.title} offers highest expected ROI at ~$${topRec.estimatedRevenue.toLocaleString()}`
      : "Pipeline recovery and conversion optimization are the primary levers today",
    recommended: topRec?.title ?? "Review stale inquiries and strengthen top converting pages",
    expectedOutcome: topRec
      ? `+${Math.round(topRec.estimatedRevenue / 1500)} bookings · ~$${topRec.estimatedRevenue.toLocaleString()} revenue`
      : "Improved inquiry response rate within 48h",
    confidence: topRec?.confidence ?? 0.7,
    evidence: topRec?.evidence ?? context.facts.slice(0, 4),
    businessImpact: topRec
      ? `Supports ${dna.northStarMetrics[0]} and ${dna.northStarMetrics[3]}`
      : "Protects pipeline revenue and client experience",
    unknowns: context.unknowns,
    alternatives: topRec
      ? ["Defer and focus on client delivery", "Run marketing campaign instead", "Optimize website conversion"]
      : ["Launch Instagram feature", "Re-engage CRM contacts", "Publish new portfolio work"],
  };
}
