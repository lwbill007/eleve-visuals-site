/**
 * Orchestrator types — modular, observable, evidence-driven AI runs.
 */

import type { ConfidenceBreakdown, EvidenceBundle } from "../evidence/schema";
import type { OrchestratorAgentId } from "../agents/tool-registry";

export type OrchestratorTaskKind =
  | "booking_submitted"
  | "booking_review"
  | "proposal_assist"
  | "website_seo"
  | "portfolio_review"
  | "crm_follow_up"
  | "general_executive";

export type AgentRunStatus = "queued" | "running" | "completed" | "skipped" | "failed";

export interface RecommendedAction {
  id: string;
  label: string;
  href?: string;
  requiresApproval: boolean;
  priority: "high" | "medium" | "low";
  ownerAgent: OrchestratorAgentId;
}

export interface AgentRunRecord {
  agentId: OrchestratorAgentId;
  title: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt?: string;
  summary: string;
  reasoning: string;
  evidenceIds: string[];
  toolsAttempted: string[];
  confidence?: number;
  error?: string;
}

export interface OrchestratorAuditLog {
  id: string;
  taskKind: OrchestratorTaskKind;
  createdAt: string;
  surface: string;
  agents: AgentRunRecord[];
  confidence: ConfidenceBreakdown;
  evidence: EvidenceBundle;
  actions: RecommendedAction[];
  executiveSummary: string;
  verificationSteps: VerificationStep[];
  provider: "rules" | "llm" | "hybrid";
}

export interface VerificationStep {
  id: string;
  label: string;
  status: "completed" | "skipped" | "failed";
  detail: string;
}

export interface OrchestratorResult {
  audit: OrchestratorAuditLog;
  executiveSummary: string;
  confidence: ConfidenceBreakdown;
  evidence: EvidenceBundle;
  actions: RecommendedAction[];
}
