/**
 * Decision Trace + Scenarios + Debate + Self-Audit builders.
 */

import type {
  DecisionTrace,
  ScenarioSimulation,
  ExecutiveDebate,
  SelfAudit,
  DecisionObservation,
} from "./types";
import { confidenceFromSources } from "./source-reliability";

export function buildDecisionTrace(input: {
  observed: DecisionObservation[];
  evidenceLabels: { label: string; present: boolean }[];
  researchLabels: { label: string; present: boolean }[];
  reasoning: string;
  businessImpact: DecisionTrace["businessImpact"];
  sourceIdsForConfidence?: string[];
  confidenceOverride?: number;
}): DecisionTrace {
  const fromSources = confidenceFromSources(input.sourceIdsForConfidence ?? ["internal-analytics"]);
  const presentEvidence = input.evidenceLabels.filter((e) => e.present).length;
  const presentResearch = input.researchLabels.filter((r) => r.present).length;

  let confidence = input.confidenceOverride ?? fromSources.score;
  if (presentEvidence === 0) confidence = Math.min(confidence, 40);
  if (presentResearch === 0) confidence = Math.min(confidence, confidence);
  if (presentEvidence >= 2 && presentResearch >= 1) confidence = Math.min(100, confidence + 5);

  const why = [
    ...fromSources.why,
    `${presentEvidence} evidence channel(s) present`,
    presentResearch > 0
      ? `${presentResearch} research channel(s) present`
      : "No verified external research attached — do not invent citations",
  ];

  return {
    observed: input.observed,
    evidenceSources: input.evidenceLabels,
    researchSources: input.researchLabels,
    reasoning: input.reasoning,
    confidence: Math.round(confidence),
    businessImpact: input.businessImpact,
    confidenceWhy: why,
  };
}

export function buildScenarioSimulation(input: {
  scenarios: ScenarioSimulation["scenarios"];
  reasoning: string;
}): ScenarioSimulation {
  const ranked = [...input.scenarios].sort((a, b) => {
    const impactRank = { "Very High": 4, High: 3, Medium: 2, Low: 1, Unknown: 0 };
    const scoreOf = (s: (typeof input.scenarios)[number]) =>
      impactRank[s.estimatedImpact] * 20 +
      s.confidence -
      (s.risk === "high" ? 15 : s.risk === "medium" ? 5 : 0);
    return scoreOf(b) - scoreOf(a);
  });

  return {
    scenarios: input.scenarios,
    recommendationOrder: ranked.map((s) => s.id),
    reasoning: input.reasoning,
    confidence: Math.round(
      ranked.length ? ranked.slice(0, 2).reduce((s, x) => s + x.confidence, 0) / Math.min(2, ranked.length) : 0
    ),
  };
}

export function buildExecutiveDebate(voices: ExecutiveDebate["voices"], ceoRecommendation: string): ExecutiveDebate {
  const hasFinanceCaution = voices.some((v) => /finance|roi|unverif/i.test(`${v.role} ${v.position} ${v.concern}`));
  return {
    voices,
    ceoRecommendation,
    dissentResolved: true,
    confidence: hasFinanceCaution ? 68 : 75,
  };
}

export function buildSelfAudit(input: {
  missingData: string[];
  assumptions: string[];
  weaknesses?: string[];
  alternatives?: string[];
  researchLimitations?: string[];
  verify?: string[];
}): SelfAudit {
  return {
    potentialWeaknesses: input.weaknesses ?? [
      "Recommendation may overfit recent window",
      "External research may be missing or expired",
    ],
    missingData: input.missingData,
    alternativeExplanations: input.alternatives ?? [
      "Seasonality rather than structural change",
      "Traffic quality shift rather than UX friction",
    ],
    researchLimitations: input.researchLimitations ?? [
      "Live web connector may be offline",
      "Industry studies are not ÉLEVÉ-specific",
    ],
    assumptions: input.assumptions,
    recommendedVerification: input.verify ?? [
      "Confirm against measured analytics before executing",
      "Require human approval for client-facing changes",
    ],
  };
}

export function defaultBookingCtaScenarios(): ScenarioSimulation["scenarios"] {
  return [
    {
      id: "A",
      label: "Add testimonials / trust signals",
      summary: "Strengthen homepage proof near primary CTA",
      estimatedImpact: "Medium",
      confidence: 72,
      risk: "low",
      effort: "low",
      truthKind: "Industry Best Practice",
      dependencies: ["Homepage CMS"],
    },
    {
      id: "B",
      label: "Reduce booking form friction",
      summary: "Simplify fields and clarify next step on /book",
      estimatedImpact: "High",
      confidence: 78,
      risk: "low",
      effort: "medium",
      truthKind: "AI Analysis",
      dependencies: ["Booking form CMS", "before/after measurement"],
    },
    {
      id: "C",
      label: "Full homepage redesign",
      summary: "Broader creative rewrite of first viewport",
      estimatedImpact: "Very High",
      confidence: 48,
      risk: "high",
      effort: "high",
      truthKind: "AI Prediction",
      dependencies: ["Creative capacity", "multi-week measurement"],
    },
  ];
}
