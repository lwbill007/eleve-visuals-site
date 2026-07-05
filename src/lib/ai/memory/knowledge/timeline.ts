import { prisma } from "@/lib/db";
import { getLearningOutcomes } from "../learning";
import { getWorkspaceId } from "../workspace";
import type { LearningTimelineEvent } from "./types";

export async function getLearningTimeline(limit = 50): Promise<LearningTimelineEvent[]> {
  const workspaceId = getWorkspaceId();
  const events: LearningTimelineEvent[] = [];

  const [refreshReports, audits, outcomes] = await Promise.all([
    prisma.aIMemory.findMany({
      where: { workspaceId, category: "refresh_report", archived: false },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.aIMemoryAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { memory: { select: { title: true, layer: true, category: true } } },
    }),
    getLearningOutcomes(undefined, 20),
  ]);

  for (const report of refreshReports) {
    let parsed: { whatChanged?: string[]; pagesScanned?: number; issuesFound?: unknown[] } = {};
    try {
      parsed = JSON.parse(report.value) as typeof parsed;
    } catch {
      /* use summary */
    }
    events.push({
      id: report.id,
      date: report.createdAt.toISOString(),
      title: report.title,
      detail: report.summary,
      category: "refresh",
      sourcePage: "platform-wide",
      memoryId: report.id,
      refreshId: report.key,
      changes: parsed.whatChanged ?? [],
      verified: true,
      confidence: report.confidence,
    });
  }

  for (const audit of audits) {
    if (audit.action === "create" && audit.memory.category === "refresh_report") continue;
    events.push({
      id: audit.id,
      date: audit.createdAt.toISOString(),
      title: `${audit.action}: ${audit.memory.title}`,
      detail: audit.reason || `${audit.memory.layer} · ${audit.memory.category}`,
      category: audit.action === "archive" ? "issue" : "memory",
      memoryId: audit.memoryId,
      verified: audit.actor !== "ai",
      changes: audit.reason ? [audit.reason] : undefined,
    });
  }

  for (const o of outcomes) {
    events.push({
      id: o.id,
      date: o.createdAt,
      title: o.outcome === "positive" ? `Learned: ${o.hypothesis || o.actionType}` : `Observation: ${o.actionType}`,
      detail: o.hypothesis || o.domain,
      category: "learning",
      verified: o.confidence >= 0.7,
      confidence: o.confidence,
      memoryId: o.memoryIds[0],
    });
  }

  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getRefreshReport(refreshId: string) {
  const row = await prisma.aIMemory.findFirst({
    where: { category: "refresh_report", key: refreshId },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Record<string, unknown>;
  } catch {
    return { summary: row.summary, title: row.title };
  }
}
