import { searchMemories, writeMemory, updateMemoryFlags } from "../store";
import { getWorkspaceId } from "../workspace";

export interface MergeResult {
  merged: number;
  archived: number;
  details: string[];
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/vol\.?\s*\d+/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return overlap / Math.max(ta.size, tb.size);
}

export async function mergeDuplicateMemories(): Promise<MergeResult> {
  const workspaceId = getWorkspaceId();
  const { items } = await searchMemories({ workspaceId, limit: 500, archived: false });
  const platform = items.filter((m) => m.tags.includes("platform-scan") && !m.pinned);

  const groups = new Map<string, typeof platform>();
  for (const mem of platform) {
    const norm = normalizeTitle(mem.title || mem.key);
    if (!norm) continue;
    const bucket = groups.get(norm) ?? [];
    bucket.push(mem);
    groups.set(norm, bucket);
  }

  let merged = 0;
  let archived = 0;
  const details: string[] = [];

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    group.sort((a, b) => b.importance - a.importance || b.confidence - a.confidence);
    const primary = group[0];

    for (const dup of group.slice(1)) {
      const overlap = tokenOverlap(normalizeTitle(primary.title), normalizeTitle(dup.title));
      const sameLayer = dup.layer === primary.layer;
      if (!sameLayer && overlap < 0.8) continue;

      const mergedTags = [...new Set([...primary.tags, ...dup.tags, "merged-duplicate"])];
      const mergedEvidence = [
        ...new Set([
          ...((primary.value.evidence as string[]) ?? []),
          ...((dup.value.evidence as string[]) ?? []),
        ]),
      ];

      await writeMemory({
        workspaceId,
        layer: primary.layer,
        category: primary.category,
        key: primary.key,
        title: primary.title,
        summary: primary.summary || dup.summary,
        value: {
          ...primary.value,
          evidence: mergedEvidence,
          linkedFromMerge: dup.id,
          lastMergedAt: new Date().toISOString(),
        },
        confidence: Math.min(1, primary.confidence + 0.03),
        importance: Math.max(primary.importance, dup.importance),
        source: primary.source,
        sourceRef: primary.sourceRef,
        tags: mergedTags,
        pinned: primary.pinned,
        verified: primary.verified,
        actor: "refresh-intelligence",
        reason: `Merged duplicate: ${dup.title}`,
      });

      await updateMemoryFlags(dup.id, { archived: true }, "refresh-intelligence", `Duplicate of ${primary.title}`);
      merged += 1;
      archived += 1;
      details.push(`Merged "${dup.title}" → "${primary.title}"`);
    }
  }

  return { merged, archived, details };
}
