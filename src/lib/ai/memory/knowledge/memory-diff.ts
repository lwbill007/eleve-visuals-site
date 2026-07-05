import { createHash } from "node:crypto";
import type { KnowledgeFinding, MemoryDiffAction, PlatformIssue } from "./types";
import type { MemoryRecord } from "../types";
import { getMemory, writeMemory, updateMemoryFlags } from "../store";
import { getWorkspaceId } from "../workspace";

export function stableHash(value: Record<string, unknown>): string {
  const sorted = JSON.stringify(value, Object.keys(value).sort());
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}

export function memoryFingerprint(layer: string, category: string, key: string) {
  return `${layer}:${category}:${key}`;
}

function findingToValue(f: KnowledgeFinding): Record<string, unknown> {
  return {
    ...f.value,
    pagePurpose: f.pagePurpose,
    whyItMatters: f.whyItMatters,
    businessArea: f.businessArea,
    evidence: f.evidence,
    sourcePage: f.sourcePage,
    issues: f.issues,
    contentHash: stableHash(f.value),
  };
}

export async function applyIntelligentMemoryDiff(
  findings: KnowledgeFinding[],
  options: { archiveMissing?: boolean } = {}
): Promise<{ actions: MemoryDiffAction[]; created: number; updated: number; archived: number; unchanged: number }> {
  const workspaceId = getWorkspaceId();
  const actions: MemoryDiffAction[] = [];
  let created = 0;
  let updated = 0;
  let archived = 0;
  let unchanged = 0;

  const activeKeys = new Set(findings.map((f) => memoryFingerprint(f.layer, f.category, f.key)));

  for (const finding of findings) {
    const fp = memoryFingerprint(finding.layer, finding.category, finding.key);
    const existing = await getMemory(finding.layer, finding.category, finding.key, workspaceId);
    const newValue = findingToValue(finding);
    const newHash = stableHash(finding.value);

    if (!existing) {
      if (finding.importance < 40 && finding.issues.length === 0) {
        actions.push({ type: "unchanged", memoryKey: fp, reason: "Below importance threshold for new memory" });
        unchanged += 1;
        continue;
      }

      await writeMemory({
        workspaceId,
        layer: finding.layer,
        category: finding.category,
        key: finding.key,
        title: finding.title,
        summary: finding.summary,
        value: newValue,
        confidence: finding.confidence,
        importance: finding.importance,
        source: "sync",
        sourceRef: finding.sourceRef,
        tags: [...finding.tags, "platform-scan", finding.businessArea],
        actor: "refresh-learn",
        reason: finding.whyItMatters,
        verified: finding.confidence >= 0.9,
      });
      actions.push({ type: "create", memoryKey: fp, finding, reason: `New: ${finding.whyItMatters}` });
      created += 1;
      continue;
    }

    const existingHash = (existing.value.contentHash as string) ?? stableHash(existing.value);
    const valueChanged = existingHash !== newHash;
    const summaryChanged = existing.summary !== finding.summary;

    if (!valueChanged && !summaryChanged) {
      const boosted = Math.min(1, existing.confidence + 0.02);
      if (boosted > existing.confidence) {
        await writeMemory({
          workspaceId,
          layer: finding.layer,
          category: finding.category,
          key: finding.key,
          title: existing.title,
          summary: existing.summary,
          value: { ...existing.value, lastVerifiedAt: new Date().toISOString() },
          confidence: boosted,
          importance: existing.importance,
          source: existing.source,
          sourceRef: existing.sourceRef,
          tags: existing.tags,
          actor: "refresh-learn",
          reason: "Reconfirmed unchanged — confidence boosted",
        });
        actions.push({
          type: "confidence_boost",
          memoryKey: fp,
          reason: "Content unchanged; confidence increased",
          previousConfidence: existing.confidence,
          newConfidence: boosted,
        });
      } else {
        actions.push({ type: "unchanged", memoryKey: fp, reason: "No meaningful change detected" });
      }
      unchanged += 1;
      continue;
    }

    const newConfidence = valueChanged
      ? Math.min(1, finding.confidence)
      : Math.min(1, existing.confidence + 0.05);

    await writeMemory({
      workspaceId,
      layer: finding.layer,
      category: finding.category,
      key: finding.key,
      title: finding.title,
      summary: finding.summary,
      value: newValue,
      confidence: newConfidence,
      importance: Math.max(existing.importance, finding.importance),
      source: "sync",
      sourceRef: finding.sourceRef,
      tags: [...new Set([...existing.tags, ...finding.tags, "platform-scan"])],
      pinned: existing.pinned,
      verified: existing.verified || finding.confidence >= 0.92,
      actor: "refresh-learn",
      reason: valueChanged ? `Updated: ${finding.whyItMatters}` : "Summary refined",
    });

    actions.push({
      type: "update",
      memoryKey: fp,
      finding,
      reason: valueChanged ? `Changed on ${finding.sourcePage}` : "Summary updated",
      previousConfidence: existing.confidence,
      newConfidence,
    });
    updated += 1;
  }

  if (options.archiveMissing) {
    const { searchMemories } = await import("../store");
    const { items: platformMemories } = await searchMemories({
      workspaceId,
      limit: 500,
      archived: false,
    });

    for (const mem of platformMemories) {
      if (!mem.tags.includes("platform-scan")) continue;
      if (mem.pinned) continue;
      const fp = memoryFingerprint(mem.layer, mem.category, mem.key);
      if (!activeKeys.has(fp) && mem.sourceRef.startsWith("platform:")) {
        await updateMemoryFlags(mem.id, { archived: true }, "refresh-learn", "Content no longer found in platform scan");
        actions.push({ type: "archive", memoryKey: fp, reason: "Obsolete — removed from platform" });
        archived += 1;
      }
    }
  }

  return { actions, created, updated, archived, unchanged };
}

export function collectIssues(findings: KnowledgeFinding[]): PlatformIssue[] {
  return findings.flatMap((f) => f.issues);
}

export function summarizeChanges(actions: MemoryDiffAction[]): {
  whatChanged: string[];
  whatImproved: string[];
  whatGotWorse: string[];
  pagesAdded: string[];
  missingInformation: string[];
  opportunities: string[];
} {
  const whatChanged: string[] = [];
  const whatImproved: string[] = [];
  const whatGotWorse: string[] = [];
  const pagesAdded: string[] = [];
  const missingInformation: string[] = [];
  const opportunities: string[] = [];

  for (const a of actions) {
    if (a.type === "create" && a.finding) {
      pagesAdded.push(a.finding.sourcePage);
      whatChanged.push(`New: ${a.finding.title} on ${a.finding.sourcePage}`);
    }
    if (a.type === "update" && a.finding) {
      whatChanged.push(`Updated: ${a.finding.title}`);
      if (a.newConfidence && a.previousConfidence && a.newConfidence > a.previousConfidence) {
        whatImproved.push(`${a.finding.title} — confidence increased`);
      }
    }
    if (a.type === "archive") {
      whatGotWorse.push(`Archived obsolete memory: ${a.memoryKey}`);
    }
    if (a.finding?.issues.length) {
      for (const issue of a.finding.issues) {
        if (issue.type === "missing_content") missingInformation.push(`${issue.page}: ${issue.title}`);
        if (issue.severity === "high") opportunities.push(`Fix: ${issue.title} on ${issue.page}`);
      }
    }
  }

  return { whatChanged, whatImproved, whatGotWorse, pagesAdded, missingInformation, opportunities };
}
