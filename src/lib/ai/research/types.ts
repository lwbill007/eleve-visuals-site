/**
 * Web Research Intelligence v2 — types.
 * Self-aware about evidence quality. Never invent sources.
 */

import type { ResearchCategory } from "./charter";

export type ResearchConfidenceLabel = "High" | "Medium" | "Low";

export type SourceTier = "highest" | "second" | "third" | "unknown";

export type ResearchMode =
  | "quick_scan"
  | "executive_brief"
  | "deep_investigation"
  | "competitive_intelligence"
  | "market_forecast"
  | "technical_audit";

export type BusinessRelevanceAxis =
  | "revenue"
  | "bookings"
  | "seo"
  | "marketing"
  | "client_experience"
  | "creative_quality"
  | "operations";

export interface SourceQualityScore {
  authority: number;
  freshness: number;
  relevance: number;
  evidence: number;
  transparency: number;
  bias: number;
  trustworthiness: number;
  overall: number;
  reasoning: string[];
}

/** Persistent / catalog profile for a known publisher */
export interface SourceProfile {
  id: string;
  name: string;
  category: string;
  authority: number;
  freshnessLabel: string;
  trust: number;
  bias: "Very Low" | "Low" | "Medium" | "High" | "Unknown";
  tier: SourceTier;
  notes: string;
}

export interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  publisher?: string;
  publicationDate: string | null;
  tier: SourceTier;
  quality: SourceQualityScore;
  profileId?: string;
  excerpt?: string;
  claim?: string;
  truthKind: "Verified External Research" | "Unknown (More Data Required)";
}

export interface ResearchConfidenceScore {
  overall: number;
  sourceQuality: number;
  sourceAgreement: number;
  freshness: number;
  businessRelevance: number;
  evidenceCoverage: number;
  unknownsCount: number;
  label: ResearchConfidenceLabel;
  why: string[];
  singleSourceWarning: boolean;
}

export interface MultiSourceChecklist {
  officialDocumentation: boolean;
  industryResearch: boolean;
  independentAnalysis: boolean;
  internalBusinessData: boolean;
  historicalPerformance: boolean;
  currentTrends: boolean;
  metMinimum: boolean;
  warning: string | null;
}

export interface ConflictingFinding {
  id: string;
  claims: { source: string; claim: string }[];
  internalAlignment: string | null;
  recommendation: string;
  confidence: number;
  truthKind: "AI Analysis";
}

export interface BusinessRelevanceResult {
  relevant: boolean;
  axes: { axis: BusinessRelevanceAxis; affected: boolean }[];
  reason: string;
  ignoredAsNoise: boolean;
}

export interface CompetitorMonitorSegment {
  id: string;
  label: string;
  track: string[];
  status: "planned" | "watching" | "no_connector";
  note: string;
}

export interface CompetitiveIntelligenceSection {
  segments: CompetitorMonitorSegment[];
  findings: string[];
  opportunities: string[];
  principle: string;
}

export interface DetectedTrend {
  id: string;
  name: string;
  momentum: "Growing" | "Stable" | "Declining" | "Unknown";
  importance: "High" | "Medium" | "Low";
  affects: BusinessRelevanceAxis[];
  confidence: number;
  recommendation: string;
  truthKind: "AI Analysis" | "Verified External Research" | "Unknown (More Data Required)";
  evidenceNote: string;
}

export interface EvidenceTimelineEvent {
  id: string;
  period: string;
  event: string;
  kind: "none" | "external" | "internal" | "outcome" | "recommendation_update";
  truthKind: string;
}

export interface ResearchCostEstimate {
  mode: ResearchMode;
  label: string;
  estimatedSeconds: { min: number; max: number };
  justified: boolean;
  justification: string;
}

export interface StrategicOpportunity {
  id: string;
  title: string;
  marketAdoption: "High" | "Medium" | "Low" | "Unknown";
  competition: "High" | "Medium" | "Low" | "Unknown";
  estimatedFit: "Excellent" | "Good" | "Fair" | "Poor" | "Unknown";
  recommendation: string;
  truthKind: "AI Analysis" | "Unknown (More Data Required)";
  evidenceNote: string;
}

export interface SelfCritique {
  whatCouldMakeThisWrong: string[];
  missingData: string[];
  alternativeExplanations: string[];
  evidenceToIncreaseConfidence: string[];
  verifyBeforeExecution: string[];
}

export interface ResearchGateDecision {
  shouldSearch: boolean;
  reason: string;
  category: ResearchCategory | null;
  triggersMatched: string[];
  internalSufficient: boolean;
  connectorAvailable: boolean;
  priorityChecked: typeof import("./charter").KNOWLEDGE_PRIORITY_ORDER;
  relevance?: BusinessRelevanceResult;
}

export interface ExecutiveResearchReport {
  version: 2;
  id: string;
  generatedAt: string;
  query: string;
  mode: ResearchMode;
  category: ResearchCategory | null;
  gate: ResearchGateDecision;
  status:
    | "skipped_internal_sufficient"
    | "skipped_not_relevant"
    | "blocked_connector"
    | "completed"
    | "insufficient_evidence";
  executiveSummary: string;
  keyDiscoveries: string[];
  businessImpact: string;
  evidence: { kind: string; text: string }[];
  supportingSources: ResearchSource[];
  sourceProfiles: SourceProfile[];
  /** @deprecated prefer researchConfidence */
  confidence: ResearchConfidenceLabel;
  confidenceReason: string;
  researchConfidence: ResearchConfidenceScore;
  multiSource: MultiSourceChecklist;
  conflicts: ConflictingFinding[];
  competitive: CompetitiveIntelligenceSection;
  trends: DetectedTrend[];
  evidenceTimeline: EvidenceTimelineEvent[];
  cost: ResearchCostEstimate;
  opportunities: StrategicOpportunity[];
  selfCritique: SelfCritique;
  unknowns: string[];
  risks: string[];
  alternatives: string[];
  recommendations: string[];
  immediateActions: string[];
  actions30d: string[];
  longTermStrategy: string[];
  agreements: string[];
  disagreements: string[];
  learningFromMemory: string[];
  disclaimer: string;
}

export interface ContinuousMonitorItem {
  topic: string;
  materialToEleve: boolean;
  status: "watching" | "no_connector" | "quiet";
  note: string;
}

export const RESEARCH_MODE_META: Record<
  ResearchMode,
  { label: string; description: string; estimatedSeconds: { min: number; max: number } }
> = {
  quick_scan: {
    label: "Quick Scan",
    description: "10–30s — one question using trusted sources",
    estimatedSeconds: { min: 8, max: 30 },
  },
  executive_brief: {
    label: "Executive Brief",
    description: "Multi-source synthesis with recommendations",
    estimatedSeconds: { min: 45, max: 100 },
  },
  deep_investigation: {
    label: "Deep Investigation",
    description: "Comprehensive research with competitors, trends, and risk",
    estimatedSeconds: { min: 100, max: 240 },
  },
  competitive_intelligence: {
    label: "Competitive Intelligence",
    description: "Public competitor activity and positioning",
    estimatedSeconds: { min: 30, max: 90 },
  },
  market_forecast: {
    label: "Market Forecast",
    description: "Scenario planning from verified data only",
    estimatedSeconds: { min: 60, max: 180 },
  },
  technical_audit: {
    label: "Technical Audit",
    description: "Documentation-first: frameworks, APIs, SEO, performance, a11y",
    estimatedSeconds: { min: 40, max: 120 },
  },
};
