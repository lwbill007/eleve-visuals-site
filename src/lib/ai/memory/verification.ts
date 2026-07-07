import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import type { MemoryRecord } from "../memory/types";
import { parseJsonArray } from "../memory/utils";

export type VerificationStatus = "pending" | "verified" | "trusted" | "archived";

const TRUSTED_CATEGORIES = new Set([
  "business_dna",
  "brand_identity",
  "pipeline-live",
  "refresh_report",
]);

const AUTO_VERIFY_SOURCES = new Set(["sync", "user"]);

export interface VerificationQueueItem {
  id: string;
  title: string;
  summary: string;
  layer: string;
  category: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  source: string;
  sourceRef: string;
  evidence: string[];
  updatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface VerificationStats {
  total: number;
  pending: number;
  verified: number;
  trusted: number;
  archived: number;
  verifiedPct: number;
  targetPct: number;
}

export async function getVerificationStats(): Promise<VerificationStats> {
  const workspaceId = getWorkspaceId();
  const [total, pending, verified, trusted, archived] = await Promise.all([
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
    prisma.aIMemory.count({ where: { workspaceId, archived: false, verificationStatus: "pending" } }),
    prisma.aIMemory.count({ where: { workspaceId, archived: false, verificationStatus: "verified" } }),
    prisma.aIMemory.count({ where: { workspaceId, archived: false, verificationStatus: "trusted" } }),
    prisma.aIMemory.count({ where: { workspaceId, archived: true } }),
  ]);

  const verifiedCount = verified + trusted;
  return {
    total,
    pending,
    verified,
    trusted,
    archived,
    verifiedPct: total > 0 ? Math.round((verifiedCount / total) * 100) : 0,
    targetPct: 90,
  };
}

export async function getVerificationQueue(limit = 50): Promise<VerificationQueueItem[]> {
  const workspaceId = getWorkspaceId();
  const rows = await prisma.aIMemory.findMany({
    where: { workspaceId, archived: false, verificationStatus: "pending" },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    layer: r.layer,
    category: r.category,
    verificationStatus: r.verificationStatus as VerificationStatus,
    confidence: r.confidence,
    source: r.source,
    sourceRef: r.sourceRef,
    evidence: [r.sourceRef, r.source].filter(Boolean),
    updatedAt: r.updatedAt.toISOString(),
    verifiedAt: r.verifiedAt?.toISOString(),
    verifiedBy: r.verifiedBy || undefined,
  }));
}

export async function setVerificationStatus(
  memoryIds: string[],
  status: VerificationStatus,
  actor = "admin",
  reason = ""
): Promise<number> {
  const workspaceId = getWorkspaceId();
  const now = new Date();
  const result = await prisma.aIMemory.updateMany({
    where: { workspaceId, id: { in: memoryIds } },
    data: {
      verificationStatus: status,
      verified: status === "verified" || status === "trusted",
      verifiedAt: status === "verified" || status === "trusted" ? now : null,
      verifiedBy: status === "verified" || status === "trusted" ? actor : "",
      archived: status === "archived",
      confidence:
        status === "trusted" ? 0.95 : status === "verified" ? 0.85 : status === "pending" ? 0.5 : undefined,
    },
  });

  for (const id of memoryIds) {
    await prisma.aIMemoryAudit.create({
      data: {
        memoryId: id,
        action: `verification_${status}`,
        before: "{}",
        after: JSON.stringify({ status, actor, reason }),
        actor,
        reason: reason || `Status → ${status}`,
      },
    });
  }

  return result.count;
}

/** Auto-verify memories backed by trusted sources (CRM sync, submissions, pinned DNA). */
export async function runAutoVerification(): Promise<{ promoted: number; trusted: number }> {
  const workspaceId = getWorkspaceId();
  let promoted = 0;
  let trusted = 0;

  const pending = await prisma.aIMemory.findMany({
    where: { workspaceId, archived: false, verificationStatus: "pending" },
    take: 500,
  });

  const toVerify: string[] = [];
  const toTrust: string[] = [];

  for (const m of pending) {
    if (TRUSTED_CATEGORIES.has(m.category) || m.pinned) {
      toTrust.push(m.id);
      continue;
    }
    if (AUTO_VERIFY_SOURCES.has(m.source)) {
      if (
        m.sourceRef.startsWith("crm:") ||
        m.sourceRef.startsWith("submission:") ||
        m.category === "client" ||
        m.category === "pipeline" ||
        m.category === "lead" ||
        m.category === "application"
      ) {
        toVerify.push(m.id);
      }
    }
    if (m.category === "mission_outcome" || m.category === "learning") {
      toVerify.push(m.id);
    }
    if (m.category === "page_intel" || m.layer === "marketing") {
      try {
        const val = JSON.parse(m.value || "{}") as { evidence?: string[]; views?: number };
        const hasAnalytics =
          (val.views && val.views > 5) ||
          val.evidence?.some((e) => e.includes("pageview") || e.includes("views"));
        if (hasAnalytics) toVerify.push(m.id);
      } catch {
        /* skip */
      }
    }
  }

  if (toVerify.length) {
    promoted = await setVerificationStatus(
      toVerify,
      "verified",
      "auto-verifier",
      "Backed by CRM/submission/sync source"
    );
  }
  if (toTrust.length) {
    trusted = await setVerificationStatus(toTrust, "trusted", "auto-verifier", "Pinned institutional knowledge");
  }

  return { promoted, trusted };
}

export function isMemoryTrustedForRecommendations(record: {
  verificationStatus?: string;
  verified?: boolean;
  pinned?: boolean;
}): boolean {
  const s = record.verificationStatus;
  if (s === "trusted" || s === "verified") return true;
  if (record.pinned && record.verified) return true;
  return false;
}

export async function getTrustedMemoriesForRecommendations(limit = 12): Promise<MemoryRecord[]> {
  const workspaceId = getWorkspaceId();
  const rows = await prisma.aIMemory.findMany({
    where: {
      workspaceId,
      archived: false,
      verificationStatus: { in: ["verified", "trusted"] },
    },
    orderBy: [{ pinned: "desc" }, { importance: "desc" }],
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    layer: r.layer as MemoryRecord["layer"],
    category: r.category,
    key: r.key,
    title: r.title,
    summary: r.summary,
    value: {},
    confidence: r.confidence,
    importance: r.importance,
    source: r.source as MemoryRecord["source"],
    sourceRef: r.sourceRef,
    verified: r.verified,
    pinned: r.pinned,
    archived: r.archived,
    tags: parseJsonArray(r.tags),
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}
