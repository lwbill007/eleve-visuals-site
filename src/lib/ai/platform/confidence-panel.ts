/**
 * Multi-factor confidence — never a single vanity number.
 */

export type ConfidenceBand = "high" | "medium" | "low" | "blocked";

export interface ConfidenceFactor {
  id: string;
  label: string;
  score: number; // 0–100
  weight: number;
  note: string;
}

export interface ConfidencePanel {
  band: ConfidenceBand;
  composite: number;
  factors: ConfidenceFactor[];
  blockers: string[];
}

export function bandFor(score: number, blockers: string[]): ConfidenceBand {
  if (blockers.length > 0 || score < 35) return "blocked";
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export function buildConfidencePanel(input: {
  verifiedDataPct: number;
  historicalFit: number;
  externalSourcesPct: number;
  predictionStability: number;
  knowledgeCoverage: number;
  missingInfoPenalty: number;
  blockers?: string[];
}): ConfidencePanel {
  const factors: ConfidenceFactor[] = [
    {
      id: "verified",
      label: "Verified data",
      score: clamp(input.verifiedDataPct),
      weight: 0.25,
      note: "% of inputs with Verified truth label",
    },
    {
      id: "historical",
      label: "Historical fit",
      score: clamp(input.historicalFit),
      weight: 0.15,
      note: "Similar past cases / learning outcomes",
    },
    {
      id: "external",
      label: "External sources",
      score: clamp(input.externalSourcesPct),
      weight: 0.2,
      note: "Healthy connectors for claimed fields",
    },
    {
      id: "stability",
      label: "Prediction stability",
      score: clamp(input.predictionStability),
      weight: 0.15,
      note: "Variance across refreshes",
    },
    {
      id: "coverage",
      label: "Knowledge coverage",
      score: clamp(input.knowledgeCoverage),
      weight: 0.15,
      note: "Graph / memory coverage for entities",
    },
    {
      id: "missing",
      label: "Missing information",
      score: clamp(100 - input.missingInfoPenalty),
      weight: 0.1,
      note: "Explicit unknowns impacting the claim",
    },
  ];

  const composite = Math.round(
    factors.reduce((s, f) => s + f.score * f.weight, 0)
  );
  const blockers = input.blockers ?? [];
  return {
    band: bandFor(composite, blockers),
    composite,
    factors,
    blockers,
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
