/**
 * ÉLEVÉ Executive Intelligence Platform v3
 * Five-layer hierarchy — never present assumptions as facts.
 */

export type ReportTruthKind =
  | "Measured Data"
  | "AI Analysis"
  | "AI Prediction"
  | "Industry Best Practice"
  | "Verified External Research"
  | "Historical Business Performance"
  | "Unknown (More Data Required)";

export type IntelligenceLayer =
  | "measured_facts"
  | "ai_analysis"
  | "verified_external_research"
  | "ai_predictions"
  | "executive_recommendations";

export type ReportHealthDomain =
  | "business"
  | "revenue"
  | "marketing"
  | "sales"
  | "operations"
  | "creative"
  | "customer"
  | "brand"
  | "knowledge_confidence"
  | "verification_coverage"
  | "automation_readiness"
  | "prediction_confidence"
  | "trend";

export interface ReportDataSource {
  id: string;
  label: string;
  present: boolean;
  detail: string;
}

export interface ReportHealthScore {
  id: ReportHealthDomain;
  label: string;
  score: number | null;
  scoreLabel: string;
  trend30d: "up" | "flat" | "down" | "unknown";
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  truthKind: ReportTruthKind;
}

export interface MeasuredMetric {
  id: string;
  label: string;
  value: string;
  truthKind: ReportTruthKind;
  note?: string;
}

export interface RootCauseHypothesis {
  id: string;
  hypothesis: string;
  confidence: number;
  supportingEvidence: string[];
  missingEvidence: string[];
  alternatives: string[];
}

export interface ReportOpportunity {
  id: string;
  title: string;
  /** Qualitative only — never invent ROI dollars here */
  opportunityScore: number;
  businessImpact: "high" | "medium" | "low";
  confidence: number;
  supportingEvidence: string[];
  dependencies: string[];
  requiredResources: string[];
  timeToValue: string;
  /** Explicit: never a fabricated $ figure */
  financialProjection: string;
  estimatedEffort: "low" | "medium" | "high";
  reasoning: string;
  truthKind: ReportTruthKind;
}

export interface ReportRisk {
  id: string;
  category:
    | "Revenue"
    | "Marketing"
    | "Operational"
    | "Brand"
    | "Technical"
    | "Customer Experience"
    | "Financial"
    | "Compliance";
  title: string;
  likelihood: "Low" | "Medium" | "High";
  severity: "Low" | "Medium" | "High";
  confidence: number;
  mitigation: string;
  owner: string;
  timeline: string;
  truthKind: ReportTruthKind;
}

export interface ReportPrediction {
  id: string;
  potentialOutcome: string;
  estimatedImpact: string;
  confidence: number;
  reasoning: string;
  dependencies: string[];
  variables: string[];
  truthKind: "AI Prediction";
}

export interface ExternalResearchItem {
  id: string;
  summary: string;
  source: string;
  publicationDate: string | null;
  confidence: number;
  present: boolean;
}

export interface ReportRecommendation {
  id: string;
  title: string;
  businessProblem: string;
  priority: "critical" | "high" | "medium" | "low";
  businessImpact: number;
  customerImpact: number;
  risk: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  confidence: number;
  evidence: { kind: ReportTruthKind; text: string }[];
  tradeoffs: string[];
  dependencies: string[];
  successMetric: string;
  owner: string;
  status: "proposed" | "approved" | "rejected" | "in_progress" | "done";
  timeline: string;
  automationAvailable: boolean;
  approvalRequired: true;
  whyImportant: string;
  assumptions: string[];
  missingInfo: string[];
  howReached: string;
  ifNothingChanges: string;
  whatNext: string;
  /** Why this recommendation exists — never a black box */
  decisionTrace?: import("../reasoning/types").DecisionTrace;
  selfAudit?: import("../reasoning/types").SelfAudit;
  actions: {
    id: string;
    label:
      | "Approve"
      | "Reject"
      | "Modify"
      | "Request More Evidence"
      | "Assign"
      | "Create Project"
      | "Schedule Review"
      | "Generate Implementation Plan";
    href?: string;
    requiresApproval: boolean;
  }[];
}

export interface StrategyOption {
  id: "conservative" | "balanced" | "aggressive" | string;
  label: string;
  summary: string;
  investment: string;
  risk: string;
  expectedOutcome: string;
  confidence: number;
  dependencies: string[];
  estimatedImpact?: "Very High" | "High" | "Medium" | "Low" | "Unknown";
}

export interface ActionPlanBucket {
  horizon: "today" | "week" | "30d" | "quarter";
  label: string;
  items: { title: string; owner: string; truthKind: ReportTruthKind }[];
}

export interface ReportConfidence {
  business: number;
  marketing: number;
  seo: number;
  ux: number;
  technical: number;
  financial: number;
  creative: number;
  overall: number;
  reasoning: string[];
}

export interface IntelligenceLayers {
  measuredFacts: MeasuredMetric[];
  aiAnalysis: RootCauseHypothesis[];
  verifiedExternalResearch: ExternalResearchItem[];
  aiPredictions: ReportPrediction[];
  recommendations: ReportRecommendation[];
}

export interface ExecutiveReportV3 {
  version: 3;
  reportType: string;
  generatedAt: string;
  provider: "rules" | "hybrid" | "ai";
  executiveSummary: string;
  dashboard: ReportHealthScore[];
  dataSources: ReportDataSource[];
  layers: IntelligenceLayers;
  /** @deprecated Prefer layers.measuredFacts */
  measuredSituation: MeasuredMetric[];
  rootCauses: RootCauseHypothesis[];
  opportunities: ReportOpportunity[];
  risks: ReportRisk[];
  predictions: ReportPrediction[];
  recommendations: ReportRecommendation[];
  strategies: StrategyOption[];
  actionPlan: ActionPlanBucket[];
  confidence: ReportConfidence;
  learningNote: string;
  disclaimer: string;
  /** Executive reasoning layer */
  liveHealth?: import("../reasoning/types").LiveBusinessHealth;
  intelligenceGraph?: import("../reasoning/types").IntelligenceGraph;
  overnightBrief?: import("../reasoning/types").ExecutiveOvernightBrief;
  scenarioSimulation?: import("../reasoning/types").ScenarioSimulation;
  executiveDebate?: import("../reasoning/types").ExecutiveDebate;
  predictionValidations?: import("../reasoning/types").PredictionRecord[];
  selfAudit?: import("../reasoning/types").SelfAudit;
}

/** Back-compat alias while surfaces migrate */
export type ExecutiveReportV2 = ExecutiveReportV3 & { version: 2 | 3 };

export const REPORT_V3_DISCLAIMER =
  "Layer 1 (Measured Data) comes from connected ÉLEVÉ OS systems only. AI Analysis, AI Prediction, and Industry Best Practice are labeled reasoning — never audited financials or guaranteed outcomes. Financial projections require verified history; otherwise the report states More financial data required. Unknown means more data is required. Trust over false confidence.";

/** @deprecated use REPORT_V3_DISCLAIMER */
export const REPORT_V2_DISCLAIMER = REPORT_V3_DISCLAIMER;

export function truthToneClass(kind: ReportTruthKind): string {
  if (kind === "Measured Data") return "border-emerald-400/40 text-emerald-300";
  if (kind === "AI Analysis") return "border-accent/40 text-accent";
  if (kind === "AI Prediction") return "border-amber-400/40 text-amber-200";
  if (kind === "Industry Best Practice") return "border-stone/40 text-fog";
  if (kind === "Verified External Research") return "border-sky-400/40 text-sky-300";
  if (kind === "Historical Business Performance") return "border-violet-400/40 text-violet-200";
  return "border-stone/40 text-muted";
}
