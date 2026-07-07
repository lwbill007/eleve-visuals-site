import { prisma } from "@/lib/db";
import type { LearningOutcomeInput } from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";

export async function recordLearningOutcome(input: LearningOutcomeInput) {
  if (!input.outcomeEvidence) {
    return null;
  }

  return prisma.aILearningOutcome.create({
    data: {
      workspaceId: input.workspaceId ?? DEFAULT_WORKSPACE_ID,
      domain: input.domain,
      actionType: input.actionType,
      actionRef: input.actionRef ?? "",
      hypothesis: input.hypothesis ?? "",
      outcome: input.outcome,
      metrics: JSON.stringify(input.metrics ?? {}),
      revenueImpact: input.revenueImpact,
      confidence: input.confidence ?? 0.5,
      memoryIds: JSON.stringify(input.memoryIds ?? []),
    },
  });
}

export async function getLearningOutcomes(domain?: string, limit = 20) {
  const rows = await prisma.aILearningOutcome.findMany({
    where: domain ? { domain } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    actionType: r.actionType,
    actionRef: r.actionRef,
    hypothesis: r.hypothesis,
    outcome: r.outcome,
    metrics: JSON.parse(r.metrics || "{}") as Record<string, unknown>,
    revenueImpact: r.revenueImpact,
    confidence: r.confidence,
    memoryIds: JSON.parse(r.memoryIds || "[]") as string[],
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getLearningSummaryForPrompt(domain?: string): Promise<string> {
  const outcomes = await getLearningOutcomes(domain, 8);
  if (outcomes.length === 0) return "No recorded learning outcomes yet.";

  return outcomes
    .map(
      (o) =>
        `- ${o.domain}/${o.actionType}: ${o.outcome}${o.revenueImpact ? ` (~$${o.revenueImpact})` : ""} — ${o.hypothesis || "observed pattern"}`
    )
    .join("\n");
}
