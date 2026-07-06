import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import { getOperatorMetrics } from "./business-operator";
import type { WebsiteHeatIntelligence, WebsiteHeatSection } from "../types";

export async function getWebsiteHeatIntelligence(days = 30): Promise<WebsiteHeatIntelligence> {
  const since = new Date(Date.now() - days * 86400000);
  const [analytics, metrics, events] = await Promise.all([
    getAnalyticsSummary(days),
    getOperatorMetrics(),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, path: true, metadata: true, conversionType: true },
    }),
  ]);

  const avgValue =
    metrics.month.bookings > 0
      ? metrics.revenue.thisMonth / metrics.month.bookings
      : 1500;

  const conversionsByPath = new Map<string, number>();
  for (const e of events.filter((ev) => ev.type === "conversion")) {
    conversionsByPath.set(e.path, (conversionsByPath.get(e.path) ?? 0) + 1);
  }

  const sections: WebsiteHeatSection[] = analytics.topPages.map((p) => {
    const conversions = conversionsByPath.get(p.path) ?? 0;
    const conversionRate = p.views > 0 ? Math.round((conversions / p.views) * 1000) / 10 : 0;
    const engagementScore = Math.min(100, Math.round(p.views / 5 + conversionRate * 10));
    let insight = "Monitor performance";
    if (p.views > 30 && conversionRate < 1) {
      insight = "High traffic, low conversion — weak CTA or messaging mismatch";
    } else if (conversionRate >= 3) {
      insight = "Strong converter — feature in campaigns";
    } else if (p.views < 10) {
      insight = "Low visibility — promote or improve internal links";
    }
    return {
      path: p.path,
      label: p.path === "/" ? "Homepage" : p.path.replace(/^\//, "").replace(/\//g, " › "),
      views: p.views,
      conversions,
      conversionRate,
      engagementScore,
      insight,
    };
  });

  const topConverters = [...sections]
    .filter((s) => s.conversions > 0 || s.conversionRate > 0.5)
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 6);

  const ignoredSections = sections
    .filter((s) => s.views < 15 && !s.path.startsWith("/admin"))
    .sort((a, b) => a.views - b.views)
    .slice(0, 6);

  const weakCtas = sections
    .filter((s) => s.views > 40 && s.conversionRate < 0.8)
    .map((s) => ({
      path: s.path,
      issue: `${s.views} views, ${s.conversionRate}% conversion — CTA or trust gap`,
      estimatedLoss: Math.round(s.views * 0.02 * avgValue),
    }))
    .slice(0, 5);

  const portfolioPages = sections
    .filter((s) => s.path.startsWith("/portfolio"))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((s) => ({
      path: s.path,
      views: s.views,
      dwellProxy: Math.round(s.engagementScore),
    }));

  const scrollEvents = events.filter(
    (e) => e.type === "engagement" && (e.metadata as { event?: string })?.event === "scroll_depth"
  );
  const depthMap = new Map<number, number>();
  for (const e of scrollEvents) {
    const depth = (e.metadata as { depth?: number })?.depth ?? 0;
    depthMap.set(depth, (depthMap.get(depth) ?? 0) + 1);
  }
  const scrollDropOff =
    depthMap.size > 0
      ? [...depthMap.entries()].map(([depth, sessions]) => ({ depth, sessions }))
      : [
          { depth: 25, sessions: Math.round(analytics.totals.pageviews * 0.7) },
          { depth: 50, sessions: Math.round(analytics.totals.pageviews * 0.45) },
          { depth: 75, sessions: Math.round(analytics.totals.pageviews * 0.25) },
          { depth: 100, sessions: Math.round(analytics.totals.pageviews * 0.12) },
        ];

  return {
    generatedAt: new Date().toISOString(),
    topConverters,
    ignoredSections,
    weakCtas,
    bestPhotos: portfolioPages,
    scrollDropOff,
  };
}
