import { linkMemories } from "../graph";
import { getMemory, writeMemory } from "../store";
import { syncAllMemories } from "../sync";
import { runLearningPass } from "../sync-learning";
import { getWorkspaceId } from "../workspace";
import { applyIntelligentMemoryDiff, collectIssues, summarizeChanges } from "./memory-diff";
import { scanEntirePlatform } from "./platform-scanner";
import type { RefreshLearnReport, RefreshTrigger } from "./types";

export async function refreshAndLearnBusinessKnowledge(
  trigger: RefreshTrigger = "manual"
): Promise<RefreshLearnReport> {
  const refreshId = `refresh-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const workspaceId = getWorkspaceId();

  const { findings, pagesScanned } = await scanEntirePlatform();

  const diffResult = await applyIntelligentMemoryDiff(findings, { archiveMissing: true });

  let graphLinksCreated = 0;
  const memoryIdCache = new Map<string, string>();

  async function resolveMemoryId(layer: string, category: string, key: string) {
    const cacheKey = `${layer}:${category}:${key}`;
    if (memoryIdCache.has(cacheKey)) return memoryIdCache.get(cacheKey)!;
    const mem = await getMemory(layer as Parameters<typeof getMemory>[0], category, key, workspaceId);
    if (mem) memoryIdCache.set(cacheKey, mem.id);
    return mem?.id;
  }

  for (const f of findings) {
    const fromId = await resolveMemoryId(f.layer, f.category, f.key);
    if (!fromId) continue;

    for (const rel of f.relatedKeys) {
      const toId = await resolveMemoryId(rel.layer, rel.category, rel.key);
      if (toId && toId !== fromId) {
        await linkMemories(fromId, toId, rel.relationType, rel.weight ?? 1, {
          sourcePage: f.sourcePage,
          refreshId,
        }).catch(() => {});
        graphLinksCreated += 1;
      }
    }
  }

  const syncResult = await syncAllMemories().catch(() => ({
    synced: 0,
    layers: [] as string[],
    learning: { recorded: 0 },
  }));

  const learning = await runLearningPass().catch(() => ({ recorded: 0 }));

  const issuesFound = collectIssues(findings);
  const summary = summarizeChanges(diffResult.actions);
  const completedAt = new Date().toISOString();

  const report: RefreshLearnReport = {
    refreshId,
    startedAt,
    completedAt,
    pagesScanned: pagesScanned.length,
    findingsGenerated: findings.length,
    memoriesCreated: diffResult.created,
    memoriesUpdated: diffResult.updated,
    memoriesArchived: diffResult.archived,
    memoriesUnchanged: diffResult.unchanged,
    graphLinksCreated,
    learningOutcomesRecorded: learning.recorded + (syncResult.learning?.recorded ?? 0),
    issuesFound,
    opportunities: summary.opportunities,
    whatChanged: summary.whatChanged,
    whatImproved: summary.whatImproved,
    whatGotWorse: summary.whatGotWorse,
    pagesAdded: summary.pagesAdded,
    missingInformation: summary.missingInformation,
    recommendationsChanged: diffResult.updated > 0 ? [`${diffResult.updated} memories updated — executive recommendations may shift`] : [],
    actions: diffResult.actions,
    transparency: {
      dataSources: [
        "Public pages (homepage, portfolio, services, booking, sessions, contact, about)",
        "Session volumes & applications",
        "CRM contacts & pipeline",
        "Analytics (30-day)",
        "Testimonials, media, automations",
        "Admin modules inventory",
        "Existing sync layers (metrics, financial, marketing)",
      ],
      uncertainAreas: issuesFound.filter((i) => i.severity === "high").map((i) => `${i.page}: ${i.title}`),
    },
  };

  await writeMemory({
    workspaceId,
    layer: "operational",
    category: "refresh_report",
    key: refreshId,
    title: `Business knowledge refresh · ${new Date().toLocaleDateString()}`,
    summary: `Scanned ${pagesScanned.length} pages · ${diffResult.created} new · ${diffResult.updated} updated · ${issuesFound.length} issues`,
    value: report as unknown as Record<string, unknown>,
    confidence: 0.95,
    importance: 90,
    source: "sync",
    sourceRef: `refresh:${trigger}`,
    tags: ["refresh-learn", trigger],
    actor: "refresh-learn",
    reason: `Triggered by ${trigger}`,
    verified: true,
  });

  return report;
}
