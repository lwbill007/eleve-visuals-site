/**
 * Principle #3 — Verification Engine
 * Continuous verification attempts; contradictions and staleness flagged.
 */

import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import { runAutoVerification, getVerificationStats } from "../memory/verification";

export type VerificationLifecycle =
  | "verified"
  | "needs_review"
  | "contradiction"
  | "outdated"
  | "archived"
  | "superseded";

export interface VerificationLifecycleReport {
  verified: number;
  needsReview: number;
  contradiction: number;
  outdated: number;
  archived: number;
  superseded: number;
  targetPct: number;
  currentPct: number;
}

export interface VerificationEngineReport {
  stats: Awaited<ReturnType<typeof getVerificationStats>>;
  lifecycle: VerificationLifecycleReport;
  contradictions: { memoryId: string; title: string; reason: string }[];
  stale: { memoryId: string; title: string; ageDays: number }[];
  promoted: number;
  trusted: number;
}

const STALE_DAYS = 90;

export async function runVerificationEngine(): Promise<VerificationEngineReport> {
  const workspaceId = getWorkspaceId();
  const [auto, stats, pendingOld] = await Promise.all([
    runAutoVerification(),
    getVerificationStats(),
    prisma.aIMemory.findMany({
      where: {
        workspaceId,
        archived: false,
        verificationStatus: "pending",
        updatedAt: { lt: new Date(Date.now() - STALE_DAYS * 86400000) },
      },
      select: { id: true, title: true, updatedAt: true },
      take: 20,
    }),
  ]);

  const contradictions: VerificationEngineReport["contradictions"] = [];
  const revenueMemories = await prisma.aIMemory.findMany({
    where: { workspaceId, category: "revenue", archived: false },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });

  for (const m of revenueMemories) {
    try {
      const val = JSON.parse(m.value || "{}") as { mtd?: number; thisMonth?: number };
      const mtd = val.mtd ?? val.thisMonth;
      if (mtd === 0 && m.confidence > 0.9) {
        contradictions.push({
          memoryId: m.id,
          title: m.title,
          reason: "High confidence revenue memory reports $0 — verify against Stripe/submissions",
        });
      }
    } catch {
      /* skip */
    }
  }

  return {
    stats,
    lifecycle: {
      verified: stats.verified + stats.trusted,
      needsReview: stats.pending,
      contradiction: contradictions.length,
      outdated: pendingOld.length,
      archived: stats.archived,
      superseded: 0,
      targetPct: stats.targetPct,
      currentPct: stats.verifiedPct,
    },
    contradictions,
    stale: pendingOld.map((m) => ({
      memoryId: m.id,
      title: m.title,
      ageDays: Math.floor((Date.now() - m.updatedAt.getTime()) / 86400000),
    })),
    promoted: auto.promoted,
    trusted: auto.trusted,
  };
}
