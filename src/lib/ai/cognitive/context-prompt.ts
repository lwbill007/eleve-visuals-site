import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import { getLearningOutcomes } from "../memory/learning";
import { formatBusinessDNAForPrompt, getBusinessDNA } from "./business-dna";
import type { RefreshLearnReport } from "../memory/knowledge/types";

async function loadLastRefreshSummary(): Promise<string | null> {
  const mem = await prisma.aIMemory.findFirst({
    where: { workspaceId: getWorkspaceId(), category: "refresh_report", archived: false },
    orderBy: { updatedAt: "desc" },
    select: { value: true, updatedAt: true },
  });
  if (!mem?.value) return null;
  try {
    const report = JSON.parse(mem.value) as RefreshLearnReport;
    return `Last refresh (${new Date(mem.updatedAt).toLocaleDateString()}): ${report.executiveReport.summary} · Health ${report.executiveReport.overallHealthScore}/100 · ${report.memoriesCreated} new, ${report.memoriesUpdated} updated`;
  } catch {
    return null;
  }
}

/** Lightweight cognitive context for AI chat — Business DNA + recent learnings. */
export async function buildCognitiveContextForPrompt(page?: string): Promise<string> {
  const [dna, refreshSummary, learnings] = await Promise.all([
    getBusinessDNA(),
    loadLastRefreshSummary(),
    getLearningOutcomes(undefined, 4),
  ]);

  const parts = [formatBusinessDNAForPrompt(dna)];

  if (refreshSummary) {
    parts.push(`EXECUTIVE INTELLIGENCE:\n${refreshSummary}`);
  }

  if (learnings.length > 0) {
    parts.push(
      `INSTITUTIONAL LEARNINGS:\n${learnings
        .map((l) => `• ${l.hypothesis || l.actionType} → ${l.outcome}${l.revenueImpact ? ` ($${l.revenueImpact})` : ""}`)
        .join("\n")}`
    );
  }

  if (page === "memory") {
    parts.push(
      "User is on the Knowledge Engine (cognitive architecture). Reference Business DNA, knowledge health, unknowns, and decision journal when answering."
    );
  }

  if (page === "intelligence" || page === "dashboard") {
    parts.push(
      "User is on executive command surfaces. Prioritize THE ONE THING, business health, and highest-ROI actions with revenue impact."
    );
  }

  return parts.join("\n\n");
}
