import { writeMemory, searchMemories, getMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { CompetitorProfile } from "./types";

export async function listCompetitorProfiles(): Promise<CompetitorProfile[]> {
  const { items } = await searchMemories({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "competitor",
    limit: 20,
  });
  return items.map((m) => ({
    ...(m.value as unknown as CompetitorProfile),
    id: m.key,
    memoryId: m.id,
  }));
}

export async function upsertCompetitorProfile(
  input: Omit<CompetitorProfile, "id" | "lastUpdatedAt" | "memoryId"> & { id?: string }
): Promise<CompetitorProfile> {
  const id = input.id ?? `competitor-${input.name.toLowerCase().replace(/\W+/g, "-")}`;
  const profile: CompetitorProfile = {
    ...input,
    id,
    lastUpdatedAt: new Date().toISOString(),
    opportunitiesForUs: input.opportunitiesForUs ?? [],
  };

  const mem = await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "competitor",
    key: id,
    title: `Competitor: ${input.name}`,
    summary: input.positioning.slice(0, 160),
    value: profile as unknown as Record<string, unknown>,
    confidence: 0.85,
    importance: 60,
    source: "user",
    sourceRef: `competitor:${id}`,
    tags: ["cmo", "competitor", "external-intel"],
    actor: "admin",
    reason: "Competitive intelligence — stored separately from brand memory",
  });

  return { ...profile, memoryId: mem.id };
}

export function analyzeCompetitiveOpportunities(
  competitors: CompetitorProfile[],
  ourAdvantages: string[]
): string[] {
  const opportunities: string[] = [];

  for (const c of competitors) {
    if (c.pricingNotes.some((p) => p.toLowerCase().includes("low") || p.toLowerCase().includes("budget"))) {
      opportunities.push(
        `${c.name} competes on price — emphasize ÉLEVÉ premium experience and editorial quality`
      );
    }
    if (c.contentStyle.toLowerCase().includes("generic")) {
      opportunities.push(`Differentiate from ${c.name} with cinematic BTS and Sessions storytelling`);
    }
    opportunities.push(...c.opportunitiesForUs);
  }

  if (ourAdvantages.includes("ÉLEVÉ Sessions — unique editorial casting series")) {
    opportunities.push("No competitor has an equivalent Sessions program — lead marketing with this moat");
  }

  return [...new Set(opportunities)].slice(0, 8);
}

export async function getCompetitor(id: string): Promise<CompetitorProfile | null> {
  const mem = await getMemory("marketing", "competitor", id, getWorkspaceId());
  if (!mem) return null;
  return { ...(mem.value as unknown as CompetitorProfile), id: mem.key, memoryId: mem.id };
}
