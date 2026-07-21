export type ApplicationEvaluationFailureKind =
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
