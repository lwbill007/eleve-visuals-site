/**
 * Cost of Ignore — every recommendation answers "what happens if I don't?"
 * Derived from expected impact × decay heuristics; never invented without evidence.
 */

export interface CostOfIgnore {
  /** Expected opportunity / revenue loss if no action is taken. */
  estimatedRevenueLoss?: number;
  /** Human time-window when decay becomes material. */
  estimatedTimeLoss?: string;
  confidence: number;
  reasoning: string;
}

type CostInput = {
  estimatedRevenue: number;
  confidence: number;
  category?: string;
  priority?: string;
  evidence?: string[];
  why?: string;
  /** Risk-style potential impact (annual or one-time). */
  potentialImpact?: number;
  severity?: "critical" | "high" | "medium" | "low";
  kind?: "opportunity" | "risk";
};

/**
 * Decay factors: acting captures most of the value; ignoring loses a share
 * that grows with urgency. Always cite evidence when present.
 */
export function buildCostOfIgnore(input: CostInput): CostOfIgnore {
  const kind = input.kind ?? "opportunity";
  const base =
    kind === "risk"
      ? input.potentialImpact ?? input.estimatedRevenue
      : input.estimatedRevenue;

  const urgencyBoost =
    input.priority === "critical" || input.severity === "critical"
      ? 0.85
      : input.priority === "high" || input.severity === "high"
        ? 0.72
        : input.priority === "medium" || input.severity === "medium"
          ? 0.55
          : 0.4;

  const estimatedRevenueLoss =
    base > 0 ? Math.round(base * urgencyBoost) : undefined;

  const estimatedTimeLoss =
    input.priority === "critical" || input.severity === "critical"
      ? "24–48 hours before conversion odds collapse"
      : input.priority === "high" || input.severity === "high"
        ? "3–7 days of compounding opportunity cost"
        : "1–2 weeks of deferred momentum";

  const evidenceHint = input.evidence?.[0];
  const category = (input.category ?? "").toLowerCase();

  let reasoning: string;
  if (kind === "risk") {
    reasoning =
      evidenceHint ??
      (category.includes("website") || /performance|speed|seo/i.test(input.why ?? "")
        ? "Slower experience and weaker visibility compound into fewer inquiries over time."
        : category.includes("sales") || /stale|inquiry|lead/i.test(input.why ?? "")
          ? "Unanswered demand cools daily — recovery cost rises while close rate falls."
          : "Leaving this unresolved keeps the underlying failure mode active.");
  } else if (evidenceHint) {
    reasoning = evidenceHint;
  } else if (category.includes("sales") || category.includes("revenue")) {
    reasoning =
      "Historically, delayed follow-up on warm inquiries converts materially less than same-day response.";
  } else {
    reasoning =
      input.why?.slice(0, 160) ||
      "Deferred action lets competitors and inertia capture the same demand window.";
  }

  const confidence = Math.min(
    0.95,
    Math.max(0.35, input.confidence * (evidenceHint ? 1.05 : 0.92))
  );

  return {
    estimatedRevenueLoss,
    estimatedTimeLoss,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}
