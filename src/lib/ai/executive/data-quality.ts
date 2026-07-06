export type DataQualityLabel =
  | "verified"
  | "estimated"
  | "predicted"
  | "calculated"
  | "incomplete"
  | "unavailable";

export interface QualifiedValue<T = string | number> {
  value: T;
  quality: DataQualityLabel;
  freshness: string;
  confidence?: number;
  lowConfidenceReason?: string;
  source?: string;
}

export function formatFreshness(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `Updated ${sec} second${sec === 1 ? "" : "s"} ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Updated ${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Updated yesterday";
  return `Updated ${day} days ago`;
}

export function qualifyMetric<T extends string | number>(input: {
  value: T;
  quality: DataQualityLabel;
  updatedAt?: string;
  confidence?: number;
  lowConfidenceReason?: string;
  source?: string;
  waitingFor?: string;
}): QualifiedValue<T> {
  const freshness = input.waitingFor
    ? `Waiting for ${input.waitingFor}`
    : input.updatedAt
      ? formatFreshness(input.updatedAt)
      : "Freshness unknown";

  return {
    value: input.value,
    quality: input.quality,
    freshness,
    confidence: input.confidence,
    lowConfidenceReason: input.lowConfidenceReason,
    source: input.source,
  };
}

export const QUALITY_LABELS: Record<DataQualityLabel, string> = {
  verified: "Verified",
  estimated: "Estimated",
  predicted: "Predicted",
  calculated: "Calculated",
  incomplete: "Incomplete",
  unavailable: "Unavailable",
};
