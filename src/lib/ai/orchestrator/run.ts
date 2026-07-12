/**
 * AI Orchestrator — selects agents, runs verification, returns evidence + audit.
 */

import { logAIAction } from "../log";
import { writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { orchestrateBookingSubmission } from "./booking";
import { orchestrateWebsiteSeo } from "./website";
import { selectAgentsForTask, agentTitle } from "./select";
import { runVerificationPipeline } from "./pipeline";
import {
  buildEvidenceBundle,
  scoreConfidenceFromEvidence,
  type EvidenceItem,
} from "../evidence/schema";
import type {
  OrchestratorAuditLog,
  OrchestratorResult,
  OrchestratorTaskKind,
  RecommendedAction,
} from "./types";

export async function runOrchestrator(input: {
  taskKind: OrchestratorTaskKind;
  submissionId?: string;
  data?: Record<string, unknown>;
  email?: string;
  query?: string;
}): Promise<OrchestratorResult> {
  if (
    (input.taskKind === "booking_submitted" || input.taskKind === "booking_review") &&
    input.submissionId &&
    input.data
  ) {
    const result = await orchestrateBookingSubmission({
      submissionId: input.submissionId,
      data: input.data,
      email: input.email,
    });
    await persistAudit(result.audit);
    await logAIAction(
      "ai_orchestrator",
      input.submissionId,
      `${input.taskKind} · agents=${result.audit.agents.length} · confidence=${result.confidence.overall}`
    );
    return result;
  }

  if (input.taskKind === "website_seo" || input.taskKind === "portfolio_review") {
    const result = await orchestrateWebsiteSeo();
    await persistAudit(result.audit);
    await logAIAction(
      "ai_orchestrator",
      "website",
      `${input.taskKind} · agents=${result.audit.agents.length} · confidence=${result.confidence.overall}`
    );
    return result;
  }

  // Generic executive path — lean CEO + strategist
  const now = new Date().toISOString();
  const agents = selectAgentsForTask(input.taskKind);
  const evidenceItems: EvidenceItem[] = [
    {
      id: "q-1",
      label: "User request",
      value: (input.query || input.taskKind).slice(0, 200),
      sourceType: "ai_inference",
      status: "estimated",
    },
  ];
  const evidence = buildEvidenceBundle("General executive request", evidenceItems);
  const confidence = scoreConfidenceFromEvidence(evidenceItems);
  const verificationSteps = await runVerificationPipeline({
    hasInternalData: false,
    evidence,
    needsLiveWeb: false,
  });

  const actions: RecommendedAction[] = [
    {
      id: "open-website",
      label: "Open Website Intelligence",
      href: "/admin/website",
      requiresApproval: false,
      priority: "medium",
      ownerAgent: "ceo",
    },
  ];

  const audit: OrchestratorAuditLog = {
    id: `orch-${input.taskKind}-${Date.now()}`,
    taskKind: input.taskKind,
    createdAt: now,
    surface: "general",
    agents: agents.map((id) => ({
      agentId: id,
      title: agentTitle(id),
      status: "completed",
      startedAt: now,
      completedAt: now,
      summary: `Participated in ${input.taskKind}`,
      reasoning: "Selected by orchestrator based on task kind",
      evidenceIds: ["q-1"],
      toolsAttempted: [],
      confidence: confidence.overall,
    })),
    confidence,
    evidence,
    actions,
    executiveSummary:
      "Orchestrator selected specialist agents for this task. Open Website Intelligence for evidence-grade site recommendations.",
    verificationSteps,
    provider: "rules",
  };

  await persistAudit(audit);
  return {
    audit,
    executiveSummary: audit.executiveSummary,
    confidence,
    evidence,
    actions,
  };
}

async function persistAudit(audit: OrchestratorAuditLog) {
  try {
    await writeMemory({
      workspaceId: getWorkspaceId(),
      category: "ai_orchestrator_audit",
      layer: "operational",
      key: audit.id,
      title: `AI Audit · ${audit.taskKind}`,
      summary: audit.executiveSummary.slice(0, 280),
      value: audit as unknown as Record<string, unknown>,
      confidence: audit.confidence.overall / 100,
      importance: 0.85,
      source: "ai",
      sourceRef: audit.id,
      tags: ["orchestrator", "audit", audit.taskKind],
    });
  } catch {
    /* non-blocking */
  }
}

export async function getLatestOrchestratorAudit(submissionId: string) {
  const { searchMemories } = await import("../memory/store");
  try {
    const res = await searchMemories({
      workspaceId: getWorkspaceId(),
      category: "ai_orchestrator_audit",
      limit: 20,
    });
    const match = res.items.find(
      (m) =>
        typeof m.value === "object" &&
        m.value &&
        String((m.value as { id?: string }).id || "").includes(submissionId)
    );
    return (match?.value as unknown as OrchestratorAuditLog) || null;
  } catch {
    return null;
  }
}
