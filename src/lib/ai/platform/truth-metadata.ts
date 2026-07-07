/**
 * Principle #1 — Truth Layer
 * Nothing authoritative without evidence metadata.
 */

export type TruthLabel = "verified" | "calculated" | "estimated" | "predicted" | "unknown";

/** @deprecated Use TruthLabel — kept for backwards compatibility */
export type LegacyTruthStatus = "verified" | "estimated" | "predicted" | "missing";

export const TRUTH_LABELS: Record<TruthLabel, string> = {
  verified: "Verified",
  calculated: "Calculated",
  estimated: "Estimated",
  predicted: "Predicted",
  unknown: "Unknown",
};

export interface TruthMetadata {
  label: TruthLabel;
  source: string;
  evidence: string[];
  timestamp: string;
  confidence: number;
  freshness: string;
  calculation: string;
  verificationStatus: "unverified" | "pending" | "verified" | "trusted" | "contradicted" | "stale";
  dependencies: string[];
  missingReason?: string;
  /** Prisma table or primary datastore */
  table?: string;
  /** SQL-ish or logical query description */
  query?: string;
  lastVerified?: string;
  owner?: string;
}

export interface TruthValue<T = string | number> extends TruthMetadata {
  value: T;
  displayLabel?: string;
  table?: string;
  api?: string;
  refreshFrequency?: string;
}

export function toTruthLabel(
  quality: import("../executive/data-quality").DataQualityLabel
): TruthLabel {
  if (quality === "verified") return "verified";
  if (quality === "calculated") return "calculated";
  if (quality === "predicted") return "predicted";
  if (quality === "unavailable" || quality === "incomplete") return "unknown";
  return "estimated";
}

export function fromLegacyTruthStatus(status: LegacyTruthStatus): TruthLabel {
  if (status === "missing") return "unknown";
  return status;
}

export function defaultConfidence(label: TruthLabel): number {
  switch (label) {
    case "verified":
      return 0.95;
    case "calculated":
      return 0.85;
    case "estimated":
      return 0.6;
    case "predicted":
      return 0.5;
    case "unknown":
      return 0;
  }
}

export function buildTruthValue<T extends string | number>(input: {
  value: T;
  label: TruthLabel;
  source: string;
  calculation: string;
  evidence?: string[];
  timestamp?: string;
  confidence?: number;
  freshness?: string;
  verificationStatus?: TruthMetadata["verificationStatus"];
  dependencies?: string[];
  missingReason?: string;
  displayLabel?: string;
  table?: string;
  api?: string;
  query?: string;
  lastVerified?: string;
  owner?: string;
  refreshFrequency?: string;
}): TruthValue<T> {
  const label = input.label;
  return {
    value: input.value,
    displayLabel: input.displayLabel,
    label,
    source: input.source,
    evidence: input.evidence ?? [],
    timestamp: input.timestamp ?? new Date().toISOString(),
    confidence: input.confidence ?? defaultConfidence(label),
    freshness: input.freshness ?? "Live",
    calculation: input.calculation,
    query: input.query ?? input.calculation,
    lastVerified: input.lastVerified ?? (label === "verified" ? input.timestamp : undefined),
    owner: input.owner ?? "ÉLEVÉ OS",
    verificationStatus: input.verificationStatus ?? (label === "verified" ? "verified" : "pending"),
    dependencies: input.dependencies ?? [],
    missingReason: input.missingReason,
    table: input.table,
    api: input.api,
    refreshFrequency: input.refreshFrequency ?? "On intelligence refresh",
  };
}

export function qualifyToTruth<T extends string | number>(
  qualified: import("../executive/data-quality").QualifiedValue<T>,
  calculation: string,
  extra?: Partial<Pick<TruthValue<T>, "table" | "api" | "evidence" | "dependencies" | "displayLabel">>
): TruthValue<T> {
  return buildTruthValue({
    value: qualified.value,
    label: toTruthLabel(qualified.quality),
    source: qualified.source ?? "Business operator",
    calculation,
    evidence: extra?.evidence ?? (qualified.source ? [qualified.source] : []),
    confidence: qualified.confidence,
    freshness: qualified.freshness,
    missingReason: qualified.lowConfidenceReason,
    displayLabel: extra?.displayLabel,
    table: extra?.table,
    api: extra?.api,
    dependencies: extra?.dependencies,
  });
}
