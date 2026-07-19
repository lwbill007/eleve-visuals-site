/**
 * Client-safe Website Intelligence types (no Prisma / analytics-server).
 */

import type { ConfidenceBreakdown, EvidenceBundle } from "../evidence/schema";

export type WebsiteTruthKind =
  | "Measured Data"
  | "AI Analysis"
  | "Industry Best Practice"
  | "Verified External Research"
  | "Estimated Opportunity";

export type WebsiteCategoryId =
  | "seo"
  | "performance"
  | "accessibility"
  | "conversion"
  | "content"
  | "brand"
  | "mobile"
  | "portfolio"
  | "booking"
  | "analytics";

export interface WebsiteCategoryScore {
  id: WebsiteCategoryId;
  label: string;
  score: number | null;
  scoreLabel: string;
  trend: "up" | "flat" | "down" | "unknown";
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  truthKind: WebsiteTruthKind;
  summary: string;
}

export interface WebsiteRecommendation {
  id: string;
  title: string;
  domain:
    | "homepage"
    | "portfolio"
    | "booking"
    | "seo"
    | "accessibility"
    | "performance"
    | "content"
    | "brand"
    | "conversion";
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  truthKind: WebsiteTruthKind;
  evidence: { kind: WebsiteTruthKind; text: string }[];
  reasoning: string;
  expectedBenefits: string[];
  potentialRisks: string[];
  implementationDifficulty: "low" | "medium" | "high";
  estimatedMinutes: number;
  successMetrics: string[];
  businessImpact: number;
  uxImpact: number;
  seoImpact: number;
  roiScore: number;
  status: "open" | "in_progress" | "done";
  actions: { id: string; label: string; href?: string; requiresApproval: boolean }[];
  whySeeingThis: string;
  ifIgnored: string;
  nextStep: string;
}

export interface WebsiteDataSource {
  id: string;
  label: string;
  present: boolean;
  detail: string;
}

export interface WebsiteIntelligenceEngine {
  generatedAt: string;
  executiveSummary: string;
  categories: WebsiteCategoryScore[];
  dataSources: WebsiteDataSource[];
  recommendations: WebsiteRecommendation[];
  confidence: ConfidenceBreakdown & {
    seo: number;
    ux: number;
    accessibility: number;
    performance: number;
    conversion: number;
    brand: number;
    content: number;
  };
  evidence: EvidenceBundle;
  heat: {
    topConverters: { path: string; conversionRate: number; views: number }[];
    weakCtas: { path: string; issue: string }[];
  };
  progress: {
    note: string;
    completedCount: number;
    openCount: number;
  };
  provider: "rules" | "hybrid";
}

export type WebsiteRecSort =
  | "business"
  | "fast"
  | "effort"
  | "roi"
  | "confidence";

export function sortWebsiteRecommendations(
  recs: WebsiteRecommendation[],
  sort: WebsiteRecSort
): WebsiteRecommendation[] {
  const copy = [...recs];
  switch (sort) {
    case "business":
      return copy.sort((a, b) => b.businessImpact - a.businessImpact);
    case "fast":
      return copy.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    case "effort":
      return copy.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes || b.roiScore - a.roiScore);
    case "confidence":
      return copy.sort((a, b) => b.confidence - a.confidence);
    case "roi":
    default:
      return copy.sort((a, b) => b.roiScore - a.roiScore);
  }
}
