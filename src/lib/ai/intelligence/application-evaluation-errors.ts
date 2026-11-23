export type ApplicationEvaluationFailureKind =
  | "billing"
  | "capacity"
  | "timeout"
  | "provider";

export interface PublicApplicationEvaluationFailure {
  kind: ApplicationEvaluationFailureKind;
  message: string;
}

export function publicApplicationEvaluationFailure(
  error: unknown
): PublicApplicationEvaluationFailure {
  const detail = error instanceof Error ? error.message : String(error);

  // Checked first: an out-of-credit account (HTTP 402) will not recover on retry.
  if (/\b402\b|insufficient credits|purchase(d)? (more )?credits|payment required/i.test(detail)) {
    return {
      kind: "billing",
      message:
        "The AI provider account has no credits, so nothing was scored. Add credits to the OpenRouter account used by this site, then run the ranking again. Previous rankings were not changed.",
    };
  }

  if (/\b429\b|rate limit|quota|capacity/i.test(detail)) {
    return {
      kind: "capacity",
      message:
        "AI capacity was temporarily unavailable. This application remains unscored; retry evaluation shortly.",
    };
  }

  if (/timeout|timed out|aborterror/i.test(detail)) {
    return {
      kind: "timeout",
      message:
        "AI evaluation timed out. This application remains unscored; retry evaluation shortly.",
    };
  }

  return {
    kind: "provider",
    message:
      "The AI provider did not return a usable evaluation. This application remains unscored; retry evaluation.",
  };
}
