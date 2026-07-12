/**
 * Executive Reasoning Layer — Decision Trace, Debate, Scenarios, Health, Graph.
 * Explains why — never a black box. Never invents measured facts.
 */

import type { ReportTruthKind } from "../platform/executive-report-v2";

export interface DecisionObservation {
  text: string;
  truthKind: ReportTruthKind;
}

export interface DecisionTrace {
  observed: DecisionObservation[];
  evidenceSources: { label: string; present: boolean }[];
  researchSources: { label: string; present: boolean; expiresAt?: string | null }[];
  reasoning: string;
  confidence: number;
  businessImpact: "critical" | "high" | "medium" | "low";
  confidenceWhy: string[];
}

export interface SourceReliability {
  id: string;
  name: string;
  authority: number;
  freshness: number;
  bias: "Very Low" | "Low" | "Medium" | "High" | "Unknown";
  historicalAccuracy: number;
  trustScore: number;
  category: string;
  expiresInDays: number;
  freshnessLabel: string;
  reasoning: string[];
}

export interface EvidenceExpiration {
  status: "Fresh" | "Aging" | "Expired" | "Unknown";
  ageDays: number | null;
  expiresInDays: number | null;
  expiresOn: string | null;
  reason: string;
  refreshRecommended: boolean;
  refreshBy: string | null;
}

export interface ScenarioOption {
  id: string;
  label: string;
  summary: string;
  estimatedImpact: "Very High" | "High" | "Medium" | "Low" | "Unknown";
  confidence: number;
  risk: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  truthKind: ReportTruthKind;
  dependencies: string[];
}

export interface ScenarioSimulation {
  scenarios: ScenarioOption[];
  recommendationOrder: string[];
  reasoning: string;
  confidence: number;
}

export interface DebateVoice {
  role: string;
  position: string;
  concern: string;
  truthKind: ReportTruthKind;
}

export interface ExecutiveDebate {
  voices: DebateVoice[];
  ceoRecommendation: string;
  dissentResolved: boolean;
  confidence: number;
}

export interface PredictionRecord {
  id: string;
  subject: string;
  predicted: string;
  predictedRange?: string;
  actual: string | null;
  accuracy: number | null;
  learning: string | null;
  status: "open" | "validated" | "missed" | "unknown";
  truthKind: "AI Prediction" | "Historical Business Performance";
}

export interface LiveHealthComponent {
  id: string;
  label: string;
  score: number | null;
  explain: string;
  trend: "up" | "flat" | "down" | "unknown";
  truthKind: ReportTruthKind;
  priority: "critical" | "high" | "medium" | "low";
}

export interface LiveBusinessHealth {
  overall: number | null;
  components: LiveHealthComponent[];
  generatedAt: string;
  disclaimer: string;
}

export interface IntelligenceGraphNode {
  id: string;
  label: string;
  metric?: string;
  truthKind: ReportTruthKind;
  status: "ok" | "watch" | "critical" | "unknown";
}

export interface IntelligenceGraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface IntelligenceGraph {
  nodes: IntelligenceGraphNode[];
  edges: IntelligenceGraphEdge[];
  changedOvernight: string[];
  downstreamAlerts: string[];
}

export interface SelfAudit {
  potentialWeaknesses: string[];
  missingData: string[];
  alternativeExplanations: string[];
  researchLimitations: string[];
  assumptions: string[];
  recommendedVerification: string[];
}

export interface ExecutiveOvernightBrief {
  whatChangedOvernight: string[];
  requiresAttentionToday: string[];
  opportunitiesAppeared: string[];
  risksIncreased: string[];
  decisionsWaiting: string[];
  doFirst: string | null;
}
