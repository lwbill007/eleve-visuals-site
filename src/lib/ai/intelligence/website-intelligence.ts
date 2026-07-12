/**
 * Backward-compatible website intelligence summary.
 * Canonical source: website-engine.ts
 */

import { buildWebsiteIntelligenceEngine } from "./website-engine";

export interface WebsiteIntelligence {
  generatedAt: string;
  overallScore: number;
  performanceScore: number;
  seoScore: number;
  conversionScore: number;
  accessibilityNotes: string[];
  topPages: { path: string; views: number; recommendation: string }[];
  weakCTAs: string[];
  recommendations: {
    id: string;
    title: string;
    detail: string;
    impact: string;
    urgency: "high" | "medium" | "low";
    href: string;
  }[];
}

export async function getWebsiteIntelligence(): Promise<WebsiteIntelligence> {
  const engine = await buildWebsiteIntelligenceEngine();
  const cat = (id: string) => engine.categories.find((c) => c.id === id);

  const scored = engine.categories
    .map((c) => c.score)
    .filter((s): s is number => typeof s === "number");
  const overallScore = scored.length
    ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : 0;

  return {
    generatedAt: engine.generatedAt,
    overallScore,
    performanceScore: cat("performance")?.score ?? 0,
    seoScore: cat("seo")?.score ?? 0,
    conversionScore: cat("conversion")?.score ?? 0,
    accessibilityNotes: engine.recommendations
      .filter((r) => r.domain === "accessibility")
      .map((r) => r.title)
      .slice(0, 4),
    topPages: engine.heat.topConverters.map((p) => ({
      path: p.path,
      views: p.views,
      recommendation: `${p.conversionRate}% conversion (measured)`,
    })),
    weakCTAs: engine.heat.weakCtas.map((w) => w.issue),
    recommendations: engine.recommendations.slice(0, 8).map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.reasoning,
      impact: `${r.truthKind} · ROI ${r.roiScore}`,
      urgency:
        r.priority === "critical" || r.priority === "high"
          ? ("high" as const)
          : r.priority === "low"
            ? ("low" as const)
            : ("medium" as const),
      href: r.actions.find((a) => a.href)?.href || "/admin/website",
    })),
  };
}
