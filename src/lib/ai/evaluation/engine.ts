/**
 * Evaluation Engine — prompts, scoring, evidence, confidence.
 * Does NOT select models, retry, or failover (Router owns those).
 */

export interface ConfidenceFactors {
  /** Weight of measured / cited evidence. */
  evidence: number;
  /** Historical success rate of the selected model for this task class. */
  modelReliability: number;
  /** Whether structured output parsed and validated. */
  structuredOutputSuccess: number;
  /** Past outcome accuracy for similar recommendations. */
  historicalAccuracy: number;
}

export interface DecomposedConfidence {
  factors: ConfidenceFactors;
  weights: ConfidenceFactors;
  overall: number;
  breakdown: {
    label: string;
    weightPct: number;
    scorePct: number;
    contributionPct: number;
  }[];
  explanation: string[];
}

const DEFAULT_WEIGHTS: ConfidenceFactors = {
  evidence: 0.4,
  modelReliability: 0.25,
  structuredOutputSuccess: 0.15,
  historicalAccuracy: 0.2,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Explainable confidence = weighted mix of four factors.
 * Never invents evidence — missing factors pull overall down honestly.
 */
export function decomposeConfidence(
  factors: Partial<ConfidenceFactors>,
  weights: Partial<ConfidenceFactors> = {}
): DecomposedConfidence {
  const w: ConfidenceFactors = {
    evidence: weights.evidence ?? DEFAULT_WEIGHTS.evidence,
    modelReliability: weights.modelReliability ?? DEFAULT_WEIGHTS.modelReliability,
    structuredOutputSuccess:
      weights.structuredOutputSuccess ?? DEFAULT_WEIGHTS.structuredOutputSuccess,
    historicalAccuracy: weights.historicalAccuracy ?? DEFAULT_WEIGHTS.historicalAccuracy,
  };
  const f: ConfidenceFactors = {
    evidence: clamp01(factors.evidence ?? 0),
    modelReliability: clamp01(factors.modelReliability ?? 0.5),
    structuredOutputSuccess: clamp01(factors.structuredOutputSuccess ?? 0),
    historicalAccuracy: clamp01(factors.historicalAccuracy ?? 0.5),
  };

  const weightSum = w.evidence + w.modelReliability + w.structuredOutputSuccess + w.historicalAccuracy;
  const normalized = {
    evidence: w.evidence / weightSum,
    modelReliability: w.modelReliability / weightSum,
    structuredOutputSuccess: w.structuredOutputSuccess / weightSum,
    historicalAccuracy: w.historicalAccuracy / weightSum,
  };

  const overall =
    f.evidence * normalized.evidence +
    f.modelReliability * normalized.modelReliability +
    f.structuredOutputSuccess * normalized.structuredOutputSuccess +
    f.historicalAccuracy * normalized.historicalAccuracy;

  const breakdown = (
    [
      ["Evidence", "evidence"],
      ["Model Reliability", "modelReliability"],
      ["Structured Output Success", "structuredOutputSuccess"],
      ["Historical Accuracy", "historicalAccuracy"],
    ] as const
  ).map(([label, key]) => {
    const weightPct = Math.round(normalized[key] * 100);
    const scorePct = Math.round(f[key] * 100);
    const contributionPct = Math.round(f[key] * normalized[key] * 100);
    return { label, weightPct, scorePct, contributionPct };
  });

  const explanation: string[] = [];
  if (f.evidence < 0.4) explanation.push("Evidence thin — measured sources incomplete.");
  if (f.structuredOutputSuccess < 0.5) {
    explanation.push("Structured output weak or missing — parse/validation incomplete.");
  }
  if (f.modelReliability < 0.5) explanation.push("Selected model has weak recent reliability.");
  if (f.historicalAccuracy < 0.5) {
    explanation.push("Limited verified outcomes for similar recommendations.");
  }
  if (!explanation.length) explanation.push("Confidence factors within healthy bands.");

  return {
    factors: f,
    weights: normalized,
    overall: Math.round(overall * 1000) / 1000,
    breakdown,
    explanation,
  };
}

/** Validate structured JSON responses without selecting models. */
export function validateStructuredJson(
  content: string,
  validate?: (content: string) => boolean
): { ok: boolean; parsed: unknown | null; error?: string } {
  try {
    const parsed: unknown = JSON.parse(content);
    if (validate && !validate(content)) {
      return { ok: false, parsed, error: "Semantic validation rejected structured output." };
    }
    return { ok: true, parsed };
  } catch (error) {
    return {
      ok: false,
      parsed: null,
      error: error instanceof Error ? error.message : "JSON parse failed",
    };
  }
}

export interface RecommendationExplainability {
  evidence: string[];
  confidence: DecomposedConfidence;
  unknowns: string[];
  businessRuleUsed?: string;
  memoryUsed?: string[];
  predictionUsed?: string;
  decisionHistory?: string[];
  generatedBy: {
    model: string;
    provider: string;
    latencyMs?: number;
    task: string;
  };
}

export function buildRecommendationExplainability(input: {
  evidence: string[];
  unknowns?: string[];
  confidence: DecomposedConfidence;
  businessRuleUsed?: string;
  memoryUsed?: string[];
  predictionUsed?: string;
  decisionHistory?: string[];
  model: string;
  provider: string;
  latencyMs?: number;
  task: string;
}): RecommendationExplainability {
  return {
    evidence: input.evidence,
    confidence: input.confidence,
    unknowns: input.unknowns ?? [],
    businessRuleUsed: input.businessRuleUsed,
    memoryUsed: input.memoryUsed,
    predictionUsed: input.predictionUsed,
    decisionHistory: input.decisionHistory,
    generatedBy: {
      model: input.model,
      provider: input.provider,
      latencyMs: input.latencyMs,
      task: input.task,
    },
  };
}
