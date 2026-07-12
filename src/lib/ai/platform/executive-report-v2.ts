/**
 * ÉLEVÉ Executive Intelligence Report 2.0
 * Shared schema — every CEO-facing report must separate measured facts from AI analysis.
 */

export type ReportTruthKind =
  | "Measured Data"
  | "AI Analysis"
  | "AI Prediction"
  | "Industry Best Practice"
  | "Verified External Research"
  | "Unknown (More Data Required)";

export type ReportHealthDomain =
  | "overall"
  | "marketing"
  | "website"
  | "sales"
  | "portfolio"
  | "seo"
  | "customer_experience"
  | "brand"
  | "revenue"
  | "growth";

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
  truthKind: "Measured Data" | "Unknown (More Data Required)";
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
  potentialImpact: "high" | "medium" | "low";
  confidence: number;
  dependencies: string[];
  estimatedEffort: "low" | "medium" | "high";
  reasoning: string;
  truthKind: ReportTruthKind;
}

export interface ReportRisk {
  id: string;
  category:
    | "Business"
    | "Marketing"
    | "Technical"
    | "Financial"
    | "Operational"
    | "Brand"
    | "Customer Experience"
    | "Legal / Compliance";
  title: string;
  level: "Low" | "Medium" | "High";
  likelihood: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  mitigation: string;
  truthKind: ReportTruthKind;
}

export interface ReportRecommendation {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  businessImpact: number;
  customerImpact: number;
  effort: "low" | "medium" | "high";
  confidence: number;
  evidence: { kind: ReportTruthKind; text: string }[];
  tradeoffs: string[];
  dependencies: string[];
  successMetric: string;
  owner: string;
  status: "proposed" | "approved" | "rejected" | "in_progress" | "done";
  timeline: string;
  whyImportant: string;
  assumptions: string[];
  missingInfo: string[];
  howReached: string;
  ifNothingChanges: string;
  actions: {
    id: string;
    label: "Approve" | "Reject" | "Modify" | "Assign" | "Create Task" | "Schedule Follow-up" | "Generate Implementation Plan";
    href?: string;
    requiresApproval: boolean;
  }[];
}

export interface StrategyOption {
  id: "conservative" | "balanced" | "aggressive";
  label: string;
  summary: string;
  risk: string;
  effort: string;
  potentialReward: string;
  dependencies: string[];
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

export interface ExecutiveReportV2 {
  version: 2;
  reportType: string;
  generatedAt: string;
  provider: "rules" | "hybrid" | "ai";
  executiveSummary: string;
  dashboard: ReportHealthScore[];
  dataSources: ReportDataSource[];
  measuredSituation: MeasuredMetric[];
  rootCauses: RootCauseHypothesis[];
  opportunities: ReportOpportunity[];
  risks: ReportRisk[];
  recommendations: ReportRecommendation[];
  strategies: StrategyOption[];
  actionPlan: ActionPlanBucket[];
  confidence: ReportConfidence;
  disclaimer: string;
}

export const REPORT_V2_DISCLAIMER =
  "Measured Data is verified from ÉLEVÉ OS systems. AI Analysis and AI Prediction are labeled reasoning — not audited financials or guaranteed outcomes. Unknown means more data is required.";

export function truthToneClass(kind: ReportTruthKind): string {
  if (kind === "Measured Data") return "border-emerald-400/40 text-emerald-300";
  if (kind === "AI Analysis") return "border-accent/40 text-accent";
  if (kind === "AI Prediction") return "border-amber-400/40 text-amber-200";
  if (kind === "Industry Best Practice") return "border-stone/40 text-fog";
  if (kind === "Verified External Research") return "border-sky-400/40 text-sky-300";
  return "border-stone/40 text-muted";
}
