import type { MemoryLayer } from "../types";

import type { ExecutiveIntelligenceReport } from "./executive-report";
import type { PlatformChange } from "./change-detector";

export type PlatformIssueType =
  | "missing_content"
  | "outdated"
  | "duplicate"
  | "inconsistency"
  | "seo"
  | "ux"
  | "conversion"
  | "branding";

export interface PlatformIssue {
  type: PlatformIssueType;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  page: string;
}

export interface KnowledgeRelation {
  layer: MemoryLayer;
  category: string;
  key: string;
  relationType: string;
  weight?: number;
}

export interface KnowledgeFinding {
  layer: MemoryLayer;
  category: string;
  key: string;
  title: string;
  summary: string;
  value: Record<string, unknown>;
  confidence: number;
  importance: number;
  sourcePage: string;
  sourceRef: string;
  whyItMatters: string;
  businessArea: string;
  evidence: string[];
  relatedKeys: KnowledgeRelation[];
  issues: PlatformIssue[];
  tags: string[];
  pagePurpose?: string;
}

export interface MemoryDiffAction {
  type: "create" | "update" | "archive" | "unchanged" | "confidence_boost";
  memoryKey: string;
  finding?: KnowledgeFinding;
  reason: string;
  previousConfidence?: number;
  newConfidence?: number;
}

export interface RefreshLearnReport {
  refreshId: string;
  startedAt: string;
  completedAt: string;
  pagesScanned: number;
  routesDiscovered: number;
  findingsGenerated: number;
  memoriesCreated: number;
  memoriesUpdated: number;
  memoriesArchived: number;
  memoriesUnchanged: number;
  memoriesMerged: number;
  graphLinksCreated: number;
  conversionChainsBuilt: number;
  learningOutcomesRecorded: number;
  issuesFound: PlatformIssue[];
  platformChanges: PlatformChange[];
  opportunities: string[];
  whatChanged: string[];
  whatImproved: string[];
  whatGotWorse: string[];
  pagesAdded: string[];
  pagesRemoved: string[];
  missingInformation: string[];
  recommendationsChanged: string[];
  actions: MemoryDiffAction[];
  executiveReport: ExecutiveIntelligenceReport;
  discoveryMethod: "router" | "hybrid" | "filesystem";
  transparency: {
    dataSources: string[];
    uncertainAreas: string[];
  };
}

export interface LearningTimelineEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  category: "refresh" | "memory" | "learning" | "issue" | "milestone";
  sourcePage?: string;
  memoryId?: string;
  refreshId?: string;
  changes?: string[];
  verified: boolean;
  confidence?: number;
}

export interface MemoryExplanation {
  memoryId: string;
  title: string;
  whyItMatters: string;
  confidence: number;
  sourcePage: string;
  sourceRef: string;
  businessArea: string;
  evidence: string[];
  relatedMemories: { id: string; title: string; relationType: string }[];
  pagesReferenced: string[];
  analyticsReferenced: string[];
  reasoningChain: string[];
  uncertain: boolean;
  uncertaintyNote?: string;
  audits: { action: string; actor: string; reason: string; createdAt: string }[];
}

/** Future automation hooks */
export type RefreshTrigger =
  | "manual"
  | "deployment"
  | "daily"
  | "weekly"
  | "portfolio_upload"
  | "session_publish"
  | "marketing_campaign"
  | "crm_update"
  | "booking_received";

/** @deprecated Use getAutomationOptions() from automation.ts */
export const REFRESH_AUTOMATION_OPTIONS: { id: RefreshTrigger; label: string; available: boolean }[] = [
  { id: "manual", label: "Manual (admin button)", available: true },
  { id: "deployment", label: "After each deployment", available: true },
  { id: "daily", label: "Daily", available: true },
  { id: "weekly", label: "Weekly", available: true },
  { id: "portfolio_upload", label: "After portfolio upload", available: true },
  { id: "session_publish", label: "After session publish", available: true },
  { id: "marketing_campaign", label: "After marketing campaign", available: true },
  { id: "crm_update", label: "After CRM updates", available: true },
  { id: "booking_received", label: "After new bookings", available: true },
];
