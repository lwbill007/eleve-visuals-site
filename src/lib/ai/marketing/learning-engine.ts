import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { writeMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { MarketingPattern } from "./types";

function pattern(
  partial: Omit<MarketingPattern, "id" | "lastObservedAt">
): MarketingPattern {
  return {
    ...partial,
    id: `pattern-${partial.category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lastObservedAt: new Date().toISOString(),
  };
}

export async function discoverMarketingPatterns(): Promise<MarketingPattern[]> {
  const workspaceId = getWorkspaceId();
  const since = new Date(Date.now() - 90 * 86400000);

  const [analytics30, analytics7, crm, submissions, utmEvents, campaigns] = await Promise.all([
    getAnalyticsSummary(30),
    getAnalyticsSummary(7),
    getAdminCRMContacts(),
    prisma.submission.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, createdAt: true, data: true, contactEmail: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, utmCampaign: { not: null } },
      select: { utmSource: true, utmCampaign: true, type: true, createdAt: true },
      take: 1000,
    }),
    searchMemories({ workspaceId, layer: "marketing", category: "campaign_case_study", limit: 30 }),
  ]);

  const patterns: MarketingPattern[] = [];

  const topPage = analytics30.topPages[0];
  if (topPage) {
    patterns.push(
      pattern({
        category: "landing_page",
        pattern: `${topPage.path} is the highest-traffic page (${topPage.views} views / 30d)`,
        evidence: [`${topPage.views} pageviews`, `${analytics30.totals.conversionRate}% site conversion`],
        confidence: 0.92,
        sampleSize: topPage.views,
        impact: "Primary discovery surface — prioritize CTAs and social promotion here",
      })
    );
  }

  const topSource = analytics30.topSources[0];
  if (topSource) {
    patterns.push(
      pattern({
        category: "acquisition_channel",
        pattern: `${topSource.source} drives the most traffic (${topSource.visits} visits)`,
        evidence: analytics30.topSources.slice(0, 3).map((s) => `${s.source}: ${s.visits}`),
        confidence: 0.88,
        sampleSize: topSource.visits,
        impact: "Invest more content budget in top acquisition channel",
      })
    );
  }

  const instagram = analytics30.topSources.find((s) => s.source.toLowerCase().includes("instagram"));
  if (instagram) {
    const ig7 = analytics7.topSources.find((s) => s.source.toLowerCase().includes("instagram"));
    const trend = ig7 ? Math.round(((ig7.visits * 4) / Math.max(instagram.visits, 1) - 1) * 100) : 0;
    patterns.push(
      pattern({
        category: "acquisition_channel",
        pattern: `Instagram referrals: ${instagram.visits} visits/30d (${trend >= 0 ? "+" : ""}${trend}% trend)`,
        evidence: [`${instagram.visits} Instagram visits`, `Conversion ${analytics30.totals.conversionRate}%`],
        confidence: 0.85,
        sampleSize: instagram.visits,
        impact: trend > 0 ? "Instagram momentum growing — increase posting cadence" : "Instagram softening — test new hooks",
      })
    );
  }

  const bookingHours = new Map<number, number>();
  for (const s of submissions.filter((x) => x.type === "booking")) {
    const h = new Date(s.createdAt).getHours();
    bookingHours.set(h, (bookingHours.get(h) ?? 0) + 1);
  }
  const bestHour = [...bookingHours.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestHour && bestHour[1] >= 2) {
    patterns.push(
      pattern({
        category: "posting_time",
        pattern: `Bookings peak around ${bestHour[0]}:00 (${bestHour[1]} inquiries in 90d)`,
        evidence: [`${bestHour[1]} bookings at hour ${bestHour[0]}`, `${submissions.filter((s) => s.type === "booking").length} total bookings`],
        confidence: Math.min(0.9, 0.5 + bestHour[1] * 0.05),
        sampleSize: bestHour[1],
        impact: "Schedule Instagram posts and emails 1–2 hours before peak inquiry time",
      })
    );
  }

  const repeatClients = crm.filter((c) => c.bookings > 1);
  const avgLtv = repeatClients.length
    ? Math.round(repeatClients.reduce((s, c) => s + c.revenue, 0) / repeatClients.length)
    : 0;
  if (repeatClients.length >= 2) {
    patterns.push(
      pattern({
        category: "client_ltv",
        pattern: `Repeat clients average $${avgLtv} LTV (${repeatClients.length} clients with 2+ bookings)`,
        evidence: repeatClients.slice(0, 3).map((c) => `${c.name}: $${c.revenue}`),
        confidence: 0.87,
        sampleSize: repeatClients.length,
        impact: "Re-engagement campaigns to repeat clients have highest ROI potential",
      })
    );
  }

  const campaignMap = new Map<string, { views: number; conversions: number }>();
  for (const e of utmEvents) {
    const key = `${e.utmSource}:${e.utmCampaign}`;
    const cur = campaignMap.get(key) ?? { views: 0, conversions: 0 };
    if (e.type === "pageview") cur.views += 1;
    if (e.type === "conversion") cur.conversions += 1;
    campaignMap.set(key, cur);
  }
  const bestUtm = [...campaignMap.entries()].sort(
    (a, b) => b[1].conversions - a[1].conversions || b[1].views - a[1].views
  )[0];
  if (bestUtm && bestUtm[1].conversions > 0) {
    const rate = Math.round((bestUtm[1].conversions / Math.max(bestUtm[1].views, 1)) * 1000) / 10;
    patterns.push(
      pattern({
        category: "offer",
        pattern: `Best UTM campaign: ${bestUtm[0]} (${rate}% conversion)`,
        evidence: [`${bestUtm[1].views} views`, `${bestUtm[1].conversions} conversions`],
        confidence: 0.78,
        sampleSize: bestUtm[1].views,
        impact: "Replicate messaging and offer structure from top UTM campaign",
      })
    );
  }

  const portfolioPages = analytics30.topPages.filter((p) => p.path.startsWith("/portfolio"));
  if (portfolioPages.length >= 2) {
    patterns.push(
      pattern({
        category: "portfolio",
        pattern: `Top portfolio: ${portfolioPages[0].path} (${portfolioPages[0].views} views) outperforms others`,
        evidence: portfolioPages.slice(0, 3).map((p) => `${p.path}: ${p.views}`),
        confidence: 0.84,
        sampleSize: portfolioPages.reduce((s, p) => s + p.views, 0),
        impact: "Feature top-performing gallery style in homepage and Instagram",
      })
    );
  }

  const monthBuckets = new Map<string, number>();
  for (const s of submissions.filter((x) => x.type === "booking")) {
    const k = `${new Date(s.createdAt).getFullYear()}-${new Date(s.createdAt).getMonth()}`;
    monthBuckets.set(k, (monthBuckets.get(k) ?? 0) + 1);
  }
  const sortedMonths = [...monthBuckets.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedMonths[0]) {
    patterns.push(
      pattern({
        category: "seasonal",
        pattern: `Strongest booking month in last 90d: ${sortedMonths[0][0]} (${sortedMonths[0][1]} inquiries)`,
        evidence: sortedMonths.slice(0, 2).map(([m, c]) => `${m}: ${c} bookings`),
        confidence: 0.72,
        sampleSize: sortedMonths[0][1],
        impact: "Plan campaigns and session launches around seasonal demand peaks",
      })
    );
  }

  for (const p of patterns) {
    await writeMemory({
      workspaceId,
      layer: "marketing",
      category: "pattern",
      key: `${p.category}-${p.pattern.slice(0, 40).replace(/\W+/g, "-").toLowerCase()}`,
      title: p.pattern.slice(0, 120),
      summary: p.impact,
      value: p as unknown as Record<string, unknown>,
      confidence: p.confidence,
      importance: Math.round(p.confidence * 80),
      source: "sync",
      sourceRef: "learning-engine",
      tags: ["cmo", "pattern", p.category],
      actor: "learning-engine",
      reason: p.impact,
    });
  }

  return patterns;
}

export async function getStoredPatterns(limit = 20): Promise<MarketingPattern[]> {
  const { items } = await searchMemories({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "pattern",
    limit,
  });
  return items.map((m) => m.value as unknown as MarketingPattern);
}
