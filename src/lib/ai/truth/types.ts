/**
 * Business Truth Layer — every metric must be explainable and traceable.
 */

export type TruthStatus = "verified" | "estimated" | "predicted" | "missing";

export interface TracedMetric<T = string | number> {
  value: T;
  status: TruthStatus;
  label?: string;
  source: string;
  table?: string;
  api?: string;
  lastUpdated: string;
  confidence: number;
  calculation: string;
  refreshFrequency: string;
  lowConfidenceReason?: string;
  evidence?: string[];
}

export interface ExecutiveConfidence {
  observed: string[];
  evidence: string[];
  supportingMemories: { id: string; title: string; status: string }[];
  supportingAnalytics: string[];
  confidence: number;
  businessImpact: string;
  revenueOpportunity: number;
  risk: string;
  dependencies: string[];
  alternatives: string[];
  unknowns: string[];
  expectedOutcome: string;
  predictionConfidence: number;
  whyNow: string;
  whyNotLater: string;
  truthStatus: TruthStatus;
}

export interface GraphHealth {
  nodes: number;
  edges: number;
  density: number;
  targetEdges: number;
  healthScore: number;
  status: "healthy" | "under_connected" | "critical";
  explanation: string;
  recentLinks: string[];
}

export interface IntegrationTruthSource {
  id: string;
  label: string;
  connected: boolean;
  status: TruthStatus;
  evidenceTable?: string;
  lastSync?: string;
  blocksDecisions: string[];
}

export interface ProductionReadinessReport {
  generatedAt: string;
  overallScore: number;
  database: { score: number; status: string; detail: string };
  apis: {
    status: "executed" | "not_run";
    score: number | null;
    passed: number;
    total: number;
    failures: string[];
  };
  memory: { score: number; verifiedPct: number; pending: number; trusted: number };
  graph: GraphHealth;
  performance: { slowEndpoints: { path: string; ms: number }[] };
  integrations: IntegrationTruthSource[];
  issues: { severity: "critical" | "high" | "medium" | "low"; title: string; fix: string }[];
}

export const TRUTH_STATUS_LABELS: Record<TruthStatus, string> = {
  verified: "Verified",
  estimated: "Estimated",
  predicted: "Predicted",
  missing: "Missing",
};

export function mapQualityToTruth(
  quality: import("../executive/data-quality").DataQualityLabel
): TruthStatus {
  if (quality === "verified") return "verified";
  if (quality === "predicted") return "predicted";
  if (quality === "unavailable" || quality === "incomplete") return "missing";
  return "estimated";
}

export function traceMetric<T extends string | number>(input: {
  value: T;
  status: TruthStatus;
  label?: string;
  source: string;
  table?: string;
  api?: string;
  lastUpdated?: string;
  confidence?: number;
  calculation: string;
  refreshFrequency?: string;
  lowConfidenceReason?: string;
  evidence?: string[];
}): TracedMetric<T> {
  return {
    value: input.value,
    status: input.status,
    label: input.label,
    source: input.source,
    table: input.table,
    api: input.api,
    lastUpdated: input.lastUpdated ?? new Date().toISOString(),
    confidence: input.confidence ?? (input.status === "verified" ? 0.9 : input.status === "missing" ? 0 : 0.55),
    calculation: input.calculation,
    refreshFrequency: input.refreshFrequency ?? "On intelligence refresh",
    lowConfidenceReason: input.lowConfidenceReason,
    evidence: input.evidence,
  };
}
