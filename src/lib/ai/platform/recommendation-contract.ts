/**
 * Principle #5 — Recommendation Engine
 * Every recommendation must be decision-grade, not decorative.
 */

import type { BusinessAction } from "../types";
import type { TruthLabel } from "./truth-metadata";
import type { ExecutiveConfidence } from "../truth/types";
import { buildExecutiveConfidence } from "../truth/confidence-engine";
import type { PrioritizedRecommendation } from "../types";

export type RecommendationUrgency = "critical" | "high" | "medium" | "low";

export type LearningStatus =
  | "proposed"
  | "accepted"
  | "in_progress"
  | "completed"
  | "verified"
  | "rejected"
  | "expired";

/** Canonical recommendation contract — every Command recommendation must satisfy this. */
export interface RecommendationContract {
  id: string;
  recommendation: string;
  problem: string;
  evidence: string[];
  confidence: number;
  businessImpact: string;
  estimatedRevenueImpact: number;
  timeRequiredMinutes: number;
  cost: string;
  owner: string;
  dependencies: string[];
  successMetric: string;
  verificationMethod: string;
  learningStatus: LearningStatus;
  difficulty: string;
  status: LearningStatus;
  category: string;
  actions: BusinessAction[];
}

export interface PredictionContract {
  id: string;
  prediction: string;
  probability: number;
  confidence: number;
  reasons: string[];
  unknowns: string[];
  evidence: string[];
}

export interface OutcomeRecord {
  recommendationId: string;
  accepted: boolean;
  completed: boolean;
  result: string | null;
  predictionCorrect: boolean | null;
  confidenceDelta: number | null;
  recordedAt: string;
}

export interface ExecutiveRecommendation {
  id: string;
  problem: string;
  title: string;
  detail: string;
  evidence: string[];
  reasoning: string;
  supportingMemories: { id: string; title: string; verificationStatus: string }[];
  supportingGraphPaths: string[];
  supportingAnalytics: string[];
  expectedRevenueImpact: number;
  expectedBookingImpact: number;
  expectedBrandImpact: string;
  expectedSeoImpact: string;
  confidence: number;
  truthLabel: TruthLabel;
  risk: string;
  urgency: RecommendationUrgency;
  timeRequiredMinutes: number;
  difficulty: string;
  dependencies: string[];
  successMetric: string;
  rollbackStrategy: string;
  owner: string;
  alternativeActions: string[];
  category: string;
  strategicScore: number;
  learningValue: string;
  actions: BusinessAction[];
  confidenceDetail: ExecutiveConfidence;
  verificationMethod?: string;
  learningStatus?: LearningStatus;
  cost?: string;
}

function urgencyFromPriority(p: string): RecommendationUrgency {
  if (p === "critical") return "critical";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

function truthLabelFromConfidence(confidence: number, evidence: string[]): TruthLabel {
  if (confidence >= 0.85 && evidence.some((e) => /submission|crm|stripe|analytics/i.test(e))) {
    return "verified";
  }
  if (confidence >= 0.75) return "calculated";
  if (confidence >= 0.55) return "estimated";
  return "predicted";
}

export function buildExecutiveRecommendation(
  rec: PrioritizedRecommendation & {
    deprioritized?: boolean;
    deprioritizeReason?: string;
    confidenceDetail?: ExecutiveConfidence;
  },
  context?: {
    supportingGraphPaths?: string[];
    owner?: string;
  }
): ExecutiveRecommendation {
  const confidenceDetail = rec.confidenceDetail ?? buildExecutiveConfidence(rec);
  const isSales = rec.category === "sales" || rec.category === "revenue";
  const bookingImpact = Math.max(1, Math.round(rec.estimatedRevenue / 1500));

  return {
    id: rec.id,
    problem: rec.deprioritizeReason ?? rec.detail,
    title: rec.title,
    detail: rec.detail,
    evidence: rec.evidence,
    reasoning: rec.whyNow,
    supportingMemories: confidenceDetail.supportingMemories.map((m) => ({
      id: m.id,
      title: m.title,
      verificationStatus: m.status,
    })),
    supportingGraphPaths: context?.supportingGraphPaths ?? [],
    supportingAnalytics: confidenceDetail.supportingAnalytics,
    expectedRevenueImpact: rec.estimatedRevenue,
    expectedBookingImpact: bookingImpact,
    expectedBrandImpact: isSales
      ? "Protects client experience via faster response — strengthens trust"
      : rec.category === "marketing"
        ? "Increases qualified discovery if aligned with portfolio positioning"
        : "Neutral to positive if execution matches brand standards",
    expectedSeoImpact:
      rec.category === "marketing" && /seo|meta|content/i.test(rec.title)
        ? "Organic lift possible in 4–12 weeks — not immediate bookings"
        : "Not a primary SEO lever",
    confidence: rec.confidence,
    truthLabel: truthLabelFromConfidence(rec.confidence, rec.evidence),
    risk: confidenceDetail.risk,
    urgency: urgencyFromPriority(rec.priority),
    timeRequiredMinutes: rec.timeToCompleteMinutes,
    difficulty: rec.difficulty,
    dependencies: confidenceDetail.dependencies,
    successMetric: isSales
      ? "Inquiry responded within 24h or booking stage advanced within 48h"
      : "Measurable lift in target metric within 14 days",
    rollbackStrategy: isSales
      ? "Revert to previous follow-up cadence; no irreversible changes"
      : "Undo content/SEO change from CMS version history",
    owner: context?.owner ?? "Studio owner",
    alternativeActions: confidenceDetail.alternatives,
    category: rec.category,
    strategicScore: Math.round(rec.estimatedRevenue * rec.confidence),
    learningValue: rec.confidence < 0.7 ? "High — fills thin outcome history" : "Medium — confirms existing pattern",
    actions: rec.actions,
    confidenceDetail,
    verificationMethod:
      "Compare success metric before/after within 14 days using owned Analytics or Bookings data",
    learningStatus: "proposed",
    cost: "Unknown — no cost ledger linked",
  };
}

export function rankRecommendations(recs: ExecutiveRecommendation[]): ExecutiveRecommendation[] {
  return [...recs].sort((a, b) => {
    const urgency: Record<RecommendationUrgency, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return (
      urgency[a.urgency] - urgency[b.urgency] ||
      b.strategicScore - a.strategicScore ||
      b.confidence - a.confidence
    );
  });
}

export function toRecommendationContract(
  rec: ExecutiveRecommendation
): RecommendationContract {
  return {
    id: rec.id,
    recommendation: rec.title,
    problem: rec.problem,
    evidence: rec.evidence,
    confidence: rec.confidence,
    businessImpact: rec.detail,
    estimatedRevenueImpact: rec.expectedRevenueImpact,
    timeRequiredMinutes: rec.timeRequiredMinutes,
    cost: rec.cost ?? "Unknown — no cost ledger linked",
    owner: rec.owner,
    dependencies: rec.dependencies,
    successMetric: rec.successMetric,
    verificationMethod:
      rec.verificationMethod ??
      "Compare success metric before/after within 14 days using owned Analytics or Bookings data",
    learningStatus: rec.learningStatus ?? "proposed",
    difficulty: rec.difficulty,
    status: rec.learningStatus ?? "proposed",
    category: rec.category,
    actions: rec.actions,
  };
}

export function buildPredictionContract(input: {
  id: string;
  prediction: string;
  probability: number;
  confidence: number;
  reasons: string[];
  unknowns: string[];
  evidence?: string[];
}): PredictionContract {
  return {
    id: input.id,
    prediction: input.prediction,
    probability: Math.max(0, Math.min(1, input.probability)),
    confidence: Math.max(0, Math.min(1, input.confidence)),
    reasons: input.reasons,
    unknowns: input.unknowns,
    evidence: input.evidence ?? input.reasons,
  };
}
