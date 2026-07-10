/**
 * Automatic Decision Journal — every Execute creates a permanent decision entry.
 * Outcomes close the loop via completeMission / recordDecisionOutcome.
 */

import { writeMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { recordLearningOutcome } from "../memory/learning";
import type { DecisionJournalEntry } from "../cognitive/types";

export type DecisionStatus = "pending" | "accepted" | "rejected" | "completed";

export interface RecordedDecision {
  id: string;
  recommendationId: string;
  recommendation: string;
  evidence: string[];
  confidence: number;
  expectedOutcome: string;
  expectedROI: number;
  executedBy: string;
  status: DecisionStatus;
  executeKind: string;
  href?: string;
  actualOutcome?: string;
  actualRevenue?: number;
  lessonsLearned?: string;
  accuracy?: number;
  timestamp: string;
}

const CATEGORY = "decision_journal";

export async function recordDecisionOnExecute(input: {
  recommendationId: string;
  title: string;
  evidence?: string[];
  confidence?: number;
  expectedRevenue?: number;
  expectedOutcome?: string;
  executeKind: string;
  href?: string;
  executedBy?: string;
}): Promise<RecordedDecision> {
  const timestamp = new Date().toISOString();
  const key = `decision-${input.recommendationId}-${Date.now()}`;
  const decision: RecordedDecision = {
    id: key,
    recommendationId: input.recommendationId,
    recommendation: input.title,
    evidence: input.evidence ?? [],
    confidence: input.confidence ?? 0.5,
    expectedOutcome:
      input.expectedOutcome ??
      (input.expectedRevenue && input.expectedRevenue > 0
        ? `Capture ~$${input.expectedRevenue.toLocaleString()} opportunity`
        : "Advance the recommended action"),
    expectedROI: input.expectedRevenue ?? 0,
    executedBy: input.executedBy ?? "studio-owner",
    status: "accepted",
    executeKind: input.executeKind,
    href: input.href,
    timestamp,
  };

  await writeMemory({
    layer: "business",
    category: CATEGORY,
    key,
    title: `Decision: ${input.title}`,
    summary: `Executed (${input.executeKind}) · expected ${decision.expectedOutcome} · ${Math.round(decision.confidence * 100)}% confidence`,
    value: decision as unknown as Record<string, unknown>,
    confidence: decision.confidence,
    importance: 88,
    source: "system",
    sourceRef: input.recommendationId,
    verified: true,
    tags: ["decision", "execute", input.executeKind, "pending-outcome"],
    actor: "decision-recorder",
    reason: "Automatic Decision Journal entry from Execute",
  });

  // Pending learning row — outcome filled when measured
  await recordLearningOutcome({
    domain: "executive",
    actionType: input.recommendationId,
    actionRef: input.title,
    hypothesis: `Decision accepted: ${decision.expectedOutcome}`,
    outcome: "neutral",
    revenueImpact: input.expectedRevenue,
    confidence: decision.confidence,
    metrics: {
      decisionId: key,
      executeKind: input.executeKind,
      status: "accepted",
      expectedROI: decision.expectedROI,
    },
    outcomeEvidence: true,
  });

  return decision;
}

export async function recordDecisionOutcome(input: {
  recommendationId: string;
  title: string;
  worked: boolean;
  actualRevenue?: number;
  expectedRevenue?: number;
  notes?: string;
}): Promise<{ lesson: string; accuracy: number }> {
  const expected = input.expectedRevenue ?? 0;
  const actual = input.actualRevenue ?? (input.worked ? expected : 0);
  const accuracy =
    expected > 0
      ? Math.min(1, Math.max(0, 1 - Math.abs(actual - expected) / expected))
      : input.worked
        ? 0.9
        : 0.35;

  const lesson = input.worked
    ? expected > 0 && actual > 0
      ? `Prediction ~$${expected.toLocaleString()} → actual ~$${actual.toLocaleString()} (${Math.round(accuracy * 100)}% accuracy). ${input.notes ?? "Learning stored."}`
      : `Action succeeded. ${input.notes ?? "Pattern reinforced for similar recommendations."}`
    : `Action did not deliver expected lift. Confidence reduced for similar recommendations. ${input.notes ?? ""}`.trim();

  const key = `decision-outcome-${input.recommendationId}-${Date.now()}`;
  const entry: RecordedDecision = {
    id: key,
    recommendationId: input.recommendationId,
    recommendation: input.title,
    evidence: [],
    confidence: accuracy,
    expectedOutcome: expected > 0 ? `~$${expected.toLocaleString()}` : "Positive business outcome",
    expectedROI: expected,
    executedBy: "studio-owner",
    status: "completed",
    executeKind: "outcome",
    actualOutcome: input.worked ? "positive" : "negative",
    actualRevenue: actual || undefined,
    lessonsLearned: lesson,
    accuracy: Math.round(accuracy * 100) / 100,
    timestamp: new Date().toISOString(),
  };

  await writeMemory({
    layer: "business",
    category: CATEGORY,
    key,
    title: `Outcome: ${input.title}`,
    summary: lesson,
    value: entry as unknown as Record<string, unknown>,
    confidence: accuracy,
    importance: 90,
    source: "system",
    sourceRef: input.recommendationId,
    verified: true,
    tags: ["decision", "outcome", input.worked ? "success" : "failure"],
    actor: "decision-recorder",
    reason: "Decision outcome closed learning loop",
  });

  await recordLearningOutcome({
    domain: "executive",
    actionType: input.recommendationId,
    actionRef: input.title,
    hypothesis: lesson,
    outcome: input.worked ? "positive" : "negative",
    revenueImpact: actual || undefined,
    confidence: accuracy,
    metrics: {
      decisionId: key,
      expectedROI: expected,
      actualRevenue: actual,
      accuracy,
      status: "completed",
    },
    outcomeEvidence: true,
  });

  return { lesson, accuracy };
}

/** Merge decision_journal memories into DecisionJournalEntry shape. */
export async function loadDecisionJournalMemories(limit = 20): Promise<DecisionJournalEntry[]> {
  const result = await searchMemories({
    workspaceId: getWorkspaceId(),
    category: CATEGORY,
    limit,
  });

  return result.items.map((m) => {
    const v = (m.value ?? {}) as Partial<RecordedDecision>;
    return {
      id: m.id,
      recommendation: v.recommendation ?? m.title.replace(/^Decision: |^Outcome: /, ""),
      status: (v.status as DecisionJournalEntry["status"]) ?? "pending",
      outcome:
        v.actualOutcome === "positive"
          ? "positive"
          : v.actualOutcome === "negative"
            ? "negative"
            : v.status === "accepted"
              ? "neutral"
              : undefined,
      revenueImpact: v.actualRevenue ?? v.expectedROI,
      predictionAccuracy: v.accuracy,
      lesson: v.lessonsLearned ?? m.summary,
      recordedAt: v.timestamp ?? m.updatedAt,
      domain: "decision",
      expectedOutcome: v.expectedOutcome,
      expectedROI: v.expectedROI,
      evidenceCount: v.evidence?.length ?? 0,
      confidence: v.confidence,
      executeKind: v.executeKind,
    };
  });
}
