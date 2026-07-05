import { getCMOIntelligence } from "../../marketing/cmo-intelligence";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildCMOBrief(): Promise<ExecutiveRoleBrief> {
  const cmo = await getCMOIntelligence(false);
  const { briefing, brand, patterns, revenueAttribution } = cmo;
  const marketingScore = briefing.scores.find((s) => s.key === "marketing")?.value ?? 50;

  return {
    id: "cmo",
    title: ROLE_META.cmo.title,
    mission: ROLE_META.cmo.mission,
    healthScore: marketingScore,
    confidence: 0.82,
    topPriority:
      briefing.biggestOpportunity?.title ??
      patterns[0]?.pattern ??
      "Promote top traffic page with Instagram carousel",
    insights: [
      { text: brand.identity.voice, kind: "fact", evidence: ["Brand institutional memory"] },
      ...patterns.slice(0, 2).map((p) => ({
        text: p.pattern,
        kind: "fact" as const,
        evidence: p.evidence,
      })),
      ...(briefing.autonomousInsights.slice(0, 1).map((i) => ({
        text: i,
        kind: "inference" as const,
      })) ?? []),
    ],
    recommendations: briefing.recommendedActions.slice(0, 3).map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      why: r.why,
      kind: (r.kind === "assumption" ? "inference" : r.kind === "idea" ? "suggestion" : r.kind) as import("../types").InsightClassification,
      confidence: r.confidence,
      expectedImpact: r.expectedImpact,
      actions: r.actions,
    })),
    metrics: [
      { label: "Campaigns", value: String(cmo.campaigns.length), source: "AIMemory" },
      { label: "Patterns", value: String(patterns.length), source: "Learning engine" },
      {
        label: "Top channel",
        value: revenueAttribution[0]?.channel ?? "—",
        source: "Analytics",
      },
      {
        label: "Conversion",
        value: `${briefing.scores.find((s) => s.key === "conversion")?.value ?? "—"}%`,
        source: "Analytics",
      },
    ],
    href: ROLE_META.cmo.href,
  };
}
