import { prisma } from "@/lib/db";
import { getEmbeddingStats } from "../memory/embeddings";
import { getWorkspaceId } from "../memory/workspace";
import { getLearningOutcomes } from "../memory/learning";
import { getVerificationStats } from "../memory/verification";
import type { KnowledgeHealthScore } from "./types";

export async function buildKnowledgeHealth(): Promise<KnowledgeHealthScore[]> {
  const workspaceId = getWorkspaceId();
  const now = Date.now();

  const [total, , archived, relations, embeddings, learnings, stale, duplicates, verificationStats] =
    await Promise.all([
      prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
      prisma.aIMemory.count({ where: { workspaceId, archived: false, verified: true } }),
      prisma.aIMemory.count({ where: { workspaceId, archived: true } }),
      prisma.aIMemoryRelation.count({ where: { workspaceId } }),
      getEmbeddingStats(),
      getLearningOutcomes(undefined, 50),
      prisma.aIMemory.count({
        where: {
          workspaceId,
          archived: false,
          updatedAt: { lt: new Date(now - 30 * 86400000) },
        },
      }),
      prisma.aIMemory.groupBy({
        by: ["layer", "category", "key"],
        where: { workspaceId, archived: false },
        having: { key: { _count: { gt: 1 } } },
      }).then((g) => g.length).catch(() => 0),
      getVerificationStats(),
    ]);

  const avgConfidence =
    total > 0
      ? await prisma.aIMemory
          .aggregate({ where: { workspaceId, archived: false }, _avg: { confidence: true } })
          .then((r) => r._avg.confidence ?? 0.7)
      : 0.7;

  const positiveLearnings = learnings.filter((l) => l.outcome === "positive").length;
  const predictionAccuracy =
    learnings.length > 0 ? Math.round((positiveLearnings / learnings.length) * 100) : 50;

  const coverage = verificationStats.verifiedPct;
  const freshness = total > 0 ? Math.round(((total - stale) / total) * 100) : 0;
  const confidenceScore = Math.round(avgConfidence * 100);
  const completeness = Math.min(100, Math.round((relations / Math.max(total * 0.5, 1)) * 100));
  const consistency = Math.max(0, 100 - duplicates * 5);
  const duplicateRate = total > 0 ? Math.round((duplicates / total) * 100) : 0;
  const embeddingCoverage =
    total > 0 ? Math.min(100, Math.round((embeddings.chunks / total) * 100)) : 0;
  const learningVelocity = Math.min(100, learnings.length * 4);
  const businessUnderstanding = Math.round(
    (coverage + confidenceScore + verificationStats.verifiedPct + embeddingCoverage) / 4
  );

  return [
    {
      id: "coverage",
      label: "Coverage",
      score: coverage,
      quality: coverage >= 70 ? "calculated" : "incomplete",
      why: `${verificationStats.verified + verificationStats.trusted} verified/trusted of ${total} (${coverage}%)`,
      howToImprove: "Use Verification Queue — batch approve or run refresh for auto-verify with analytics backing",
    },
    {
      id: "freshness",
      label: "Freshness",
      score: freshness,
      quality: freshness >= 80 ? "verified" : "estimated",
      why: `${stale} memories older than 30 days · ${archived} archived`,
      howToImprove: "Refresh after deployments, bookings, and content changes",
    },
    {
      id: "confidence",
      label: "Confidence",
      score: confidenceScore,
      quality: confidenceScore >= 75 ? "calculated" : "estimated",
      why: `Average memory confidence ${Math.round(avgConfidence * 100)}%`,
      howToImprove: "Verify high-importance memories; complete missions to score outcomes",
    },
    {
      id: "completeness",
      label: "Completeness",
      score: completeness,
      quality: "calculated",
      why: `${relations} graph relationships · target ${Math.round(total * 0.5)} for healthy density`,
      howToImprove: "Strengthen graph during refresh — link clients, pages, bookings, revenue",
    },
    {
      id: "verification",
      label: "Verification",
      score: verificationStats.verifiedPct,
      quality: verificationStats.verifiedPct >= 90 ? "verified" : "incomplete",
      why: `${verificationStats.verified} verified · ${verificationStats.trusted} trusted · ${verificationStats.pending} pending`,
      howToImprove: "Review Unknowns Center and verify critical business facts",
    },
    {
      id: "consistency",
      label: "Consistency",
      score: consistency,
      quality: consistency >= 90 ? "verified" : "estimated",
      why: duplicateRate > 0 ? `${duplicateRate}% potential duplicate keys` : "No duplicate keys detected",
      howToImprove: "Run duplicate merge during intelligence refresh",
    },
    {
      id: "duplicates",
      label: "Duplicate Rate",
      score: Math.max(0, 100 - duplicateRate * 2),
      quality: "calculated",
      why: `${duplicates} duplicate key groups detected`,
      howToImprove: "Automatic merge runs on each refresh",
    },
    {
      id: "prediction",
      label: "Prediction Accuracy",
      score: predictionAccuracy,
      quality: learnings.length >= 5 ? "calculated" : "predicted",
      why: `${positiveLearnings}/${learnings.length} learning outcomes positive`,
      howToImprove: "Complete missions and log recommendation outcomes",
    },
    {
      id: "understanding",
      label: "Business Understanding",
      score: businessUnderstanding,
      quality: businessUnderstanding >= 70 ? "calculated" : "estimated",
      why: "Composite of coverage, confidence, verification, and semantic index",
      howToImprove: "Sync CRM, analytics, and brand DNA regularly",
    },
    {
      id: "velocity",
      label: "Learning Velocity",
      score: learningVelocity,
      quality: "calculated",
      why: `${learnings.length} recorded learning outcomes`,
      howToImprove: "Every completed action becomes training data — log outcomes",
    },
  ];
}
