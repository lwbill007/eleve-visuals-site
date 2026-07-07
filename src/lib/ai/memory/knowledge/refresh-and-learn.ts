import { linkMemories } from "../graph";
import { getMemory, writeMemory } from "../store";
import { syncAllMemories } from "../sync";
import { runLearningPass } from "../sync-learning";
import { getWorkspaceId } from "../workspace";
import { applyIntelligentMemoryDiff, collectIssues, summarizeChanges } from "./memory-diff";
import { scanEntirePlatform } from "./platform-scanner";
import {
  buildScanSnapshot,
  detectPlatformChanges,
  loadPreviousSnapshot,
  saveScanSnapshot,
  changesToIssues,
} from "./change-detector";
import { mergeDuplicateMemories } from "./duplicate-merger";
import { buildConversionChains } from "./graph-chains";
import { generateExecutiveIntelligenceReport } from "./executive-report";
import { recordAutomationRun, isScheduleEnabled, getIntelligenceAutomationSettings } from "./automation";
import { strengthenKnowledgeGraph } from "../../executive/graph-builder";
import type { RefreshLearnReport, RefreshTrigger } from "./types";

export async function refreshIntelligence(trigger: RefreshTrigger = "manual"): Promise<RefreshLearnReport> {
  const settings = await getIntelligenceAutomationSettings();
  if (trigger !== "manual" && !isScheduleEnabled(settings, trigger)) {
    throw new Error(`Intelligence refresh not enabled for trigger: ${trigger}`);
  }

  const refreshId = `intel-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const workspaceId = getWorkspaceId();

  const { findings, pagesScanned, routes } = await scanEntirePlatform();
  const previousSnapshot = await loadPreviousSnapshot();
  const currentSnapshot = buildScanSnapshot(findings, pagesScanned);
  const platformChanges = detectPlatformChanges(previousSnapshot, currentSnapshot, findings);
  await saveScanSnapshot(currentSnapshot);

  const diffResult = await applyIntelligentMemoryDiff(findings, { archiveMissing: true });
  const mergeResult = await mergeDuplicateMemories();

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

  const chainResult = await buildConversionChains(findings, refreshId);
  graphLinksCreated += chainResult.linksCreated;

  await strengthenKnowledgeGraph().catch(() => {});

  const { runAutoVerification } = await import("../verification");
  await runAutoVerification().catch(() => ({ promoted: 0, trusted: 0 }));

  const syncResult = await syncAllMemories().catch(() => ({
    synced: 0,
    layers: [] as string[],
    learning: { recorded: 0 },
  }));

  const learning = await runLearningPass().catch(() => ({ recorded: 0 }));

  const { reindexAllMemoryEmbeddings } = await import("../embeddings");
  const embedResult = await reindexAllMemoryEmbeddings(400).catch(() => ({ indexed: 0, chunks: 0 }));

  const scanIssues = collectIssues(findings);
  const changeIssues = changesToIssues(platformChanges);
  const issuesFound = [...scanIssues, ...changeIssues];
  const summary = summarizeChanges(diffResult.actions);

  const pagesAdded = platformChanges.filter((c) => c.type === "new_page").map((c) => c.page);
  const pagesRemoved = platformChanges.filter((c) => c.type === "deleted_page").map((c) => c.page);

  const whatChanged = [
    ...platformChanges.map((c) => `${c.title} — ${c.page}`),
    ...summary.whatChanged,
  ];
  const whatImproved = [
    ...diffResult.actions
      .filter((a) => a.type === "confidence_boost")
      .map((a) => a.reason),
    ...summary.whatImproved,
  ];
  const whatGotWorse = [
    ...platformChanges.filter((c) => c.severity === "high").map((c) => `${c.page}: ${c.title}`),
    ...summary.whatGotWorse,
  ];

  const executiveReport = generateExecutiveIntelligenceReport({
    refreshId,
    findings,
    changes: platformChanges,
    issues: issuesFound,
    mergeDetails: mergeResult.details,
    pagesScanned: pagesScanned.length,
  });
  executiveReport.whatImproved = whatImproved;
  executiveReport.whatChanged = [...new Set([...executiveReport.whatChanged, ...whatChanged])];
  executiveReport.whatDeclined = [...new Set([...executiveReport.whatDeclined, ...whatGotWorse])];

  const completedAt = new Date().toISOString();

  const report: RefreshLearnReport = {
    refreshId,
    startedAt,
    completedAt,
    pagesScanned: pagesScanned.length,
    routesDiscovered: routes.length,
    findingsGenerated: findings.length,
    memoriesCreated: diffResult.created,
    memoriesUpdated: diffResult.updated,
    memoriesArchived: diffResult.archived,
    memoriesUnchanged: diffResult.unchanged,
    memoriesMerged: mergeResult.merged,
    graphLinksCreated,
    conversionChainsBuilt: chainResult.chains.length,
    learningOutcomesRecorded: learning.recorded + (syncResult.learning?.recorded ?? 0),
    issuesFound,
    platformChanges,
    opportunities: [...executiveReport.recommendations.slice(0, 5).map((r) => r.title), ...summary.opportunities],
    whatChanged,
    whatImproved,
    whatGotWorse,
    pagesAdded: [...new Set([...pagesAdded, ...summary.pagesAdded])],
    pagesRemoved,
    missingInformation: [
      ...executiveReport.missingContent,
      ...summary.missingInformation,
    ],
    recommendationsChanged:
      executiveReport.recommendations.length > 0
        ? executiveReport.recommendations.slice(0, 3).map((r) => r.title)
        : [],
    actions: diffResult.actions,
    executiveReport,
    discoveryMethod: "filesystem",
    transparency: {
      dataSources: [
        "Next.js App Router (automatic filesystem discovery — no hardcoded routes)",
        "Dynamic expansion (portfolio, sessions, cast slugs from database)",
        "Infrastructure routes (robots.txt, sitemap.xml, 404)",
        "Semantic analysis (purpose, CTAs, pricing, SEO, branding, tone)",
        "CRM, pipeline, sponsorship, analytics",
        "Scan snapshot diff (change detection timeline)",
        "Knowledge graph + conversion chains",
      ],
      uncertainAreas: issuesFound.filter((i) => i.severity === "high").map((i) => `${i.page}: ${i.title}`),
    },
  };

  await writeMemory({
    workspaceId,
    layer: "marketing",
    category: "executive_report",
    key: "website-health",
    title: "Website intelligence health",
    summary: executiveReport.summary,
    value: {
      overallHealthScore: executiveReport.overallHealthScore,
      seoScore: executiveReport.overallHealthScore,
      uxScore: executiveReport.overallHealthScore,
      recommendations: executiveReport.recommendations.map((r) => r.title),
      issues: issuesFound.slice(0, 12).map((i) => ({
        title: i.title,
        detail: i.detail,
        severity: i.severity,
      })),
      embeddingsIndexed: embedResult.chunks,
    },
    confidence: 0.9,
    importance: 88,
    source: "sync",
    sourceRef: refreshId,
    tags: ["website-intelligence", "seo", trigger],
    actor: "refresh-intelligence",
  });

  await writeMemory({
    workspaceId,
    layer: "operational",
    category: "refresh_report",
    key: refreshId,
    title: `Intelligence refresh · ${new Date().toLocaleDateString()}`,
    summary: report.executiveReport.summary,
    value: report as unknown as Record<string, unknown>,
    confidence: 0.97,
    importance: 95,
    source: "sync",
    sourceRef: `refresh:${trigger}`,
    tags: ["refresh-intelligence", "executive-report", trigger],
    actor: "refresh-intelligence",
    reason: `Triggered by ${trigger}`,
    verified: true,
  });

  await recordAutomationRun(trigger);

  return report;
}

/** @alias refreshIntelligence */
export const refreshAndLearnBusinessKnowledge = refreshIntelligence;
