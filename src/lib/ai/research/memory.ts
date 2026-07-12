/**
 * Research memory — verified findings, decisions, outcomes, learning loop.
 */

import { writeMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { ExecutiveResearchReport } from "./types";

export async function persistResearchReport(report: ExecutiveResearchReport): Promise<void> {
  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "business",
    category: "web_research",
    key: report.id,
    title: `Web research v${report.version} · ${report.query.slice(0, 72)}`,
    summary: report.executiveSummary.slice(0, 280),
    value: report as unknown as Record<string, unknown>,
    confidence: report.researchConfidence.overall / 100,
    importance: report.status === "completed" ? 75 : 45,
    source: "ai",
    sourceRef: "web-research-intelligence-v2",
    tags: [
      "web-research",
      "v2",
      report.status,
      report.mode,
      report.category || "uncategorized",
      report.researchConfidence.singleSourceWarning ? "single-source" : "multi-source-ok",
    ],
    verified:
      report.status === "completed" &&
      report.supportingSources.some((s) => s.truthKind === "Verified External Research"),
    actor: "research-division",
    reason: "Executive Research Division v2 — evidence-quality scored; not a substitute for measured data",
  });
}

export async function listRecentResearch(limit = 10): Promise<ExecutiveResearchReport[]> {
  const { items } = await searchMemories({
    workspaceId: getWorkspaceId(),
    category: "web_research",
    limit,
  }).catch(() => ({ items: [] as { value: unknown }[] }));

  return items
    .map((r) => r.value as unknown as ExecutiveResearchReport)
    .filter((v) => v && typeof v === "object" && (v.version === 2 || v.version === 1));
}

export async function findRelatedOutcomes(query: string): Promise<string[]> {
  const q = query.toLowerCase();
  const tokens = q.split(/\W+/).filter((t) => t.length > 4).slice(0, 6);
  if (tokens.length === 0) return [];

  const [{ items: decisions }, { items: research }] = await Promise.all([
    searchMemories({
      workspaceId: getWorkspaceId(),
      category: "web_research_decision",
      limit: 20,
    }).catch(() => ({ items: [] })),
    searchMemories({
      workspaceId: getWorkspaceId(),
      category: "web_research",
      limit: 20,
    }).catch(() => ({ items: [] })),
  ]);

  const lessons: string[] = [];

  for (const d of decisions) {
    const val = d.value as {
      decision?: string;
      note?: string;
      outcome?: string;
      researchId?: string;
    };
    const hay = `${d.title} ${d.summary} ${val.note ?? ""} ${val.outcome ?? ""}`.toLowerCase();
    if (!tokens.some((t) => hay.includes(t))) continue;
    if (val.decision === "accepted" && val.outcome) {
      lessons.push(`Prior accepted research outcome: ${val.outcome}`);
    } else if (val.decision === "rejected") {
      lessons.push(`Prior rejection: ${val.note || d.summary || "recommendation rejected"}`);
    } else if (val.outcome) {
      lessons.push(`Prior outcome: ${val.outcome}`);
    }
  }

  for (const r of research) {
    const report = r.value as unknown as ExecutiveResearchReport;
    if (!report?.query) continue;
    const hay = report.query.toLowerCase();
    if (!tokens.some((t) => hay.includes(t))) continue;
    if (report.status === "completed" && report.researchConfidence?.overall >= 70) {
      lessons.push(
        `Similar prior report (${report.researchConfidence.overall}% confidence): ${report.executiveSummary.slice(0, 120)}`
      );
    }
  }

  return [...new Set(lessons)].slice(0, 5);
}

export async function recordResearchDecision(input: {
  researchId: string;
  decision: "accepted" | "rejected" | "deferred";
  note?: string;
  outcome?: string;
}): Promise<void> {
  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "business",
    category: "web_research_decision",
    key: `${input.researchId}-${input.decision}-${Date.now()}`,
    title: `Research ${input.decision}: ${input.researchId}`,
    summary: input.note || input.outcome || input.decision,
    value: {
      ...input,
      recordedAt: new Date().toISOString(),
    },
    confidence: 0.9,
    importance: 65,
    source: "user",
    sourceRef: "web-research-intelligence-v2",
    tags: ["web-research", "decision", input.decision, "learning"],
    verified: true,
    actor: "operator",
    reason: "Human research decision for continuous learning",
  });
}
