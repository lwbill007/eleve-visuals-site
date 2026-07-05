import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { writeMemory } from "./store";
import { getWorkspaceId } from "./workspace";
import { syncCMOMemory } from "../marketing/cmo-intelligence";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syncMarketingMemory() {
  const workspaceId = getWorkspaceId();
  const period = monthKey();
  const since = new Date(Date.now() - 30 * 86400000);
  let synced = 0;
  const layers = new Set<string>(["marketing"]);

  const [analytics30, analytics7, notifications, utmEvents] = await Promise.all([
    getAnalyticsSummary(30),
    getAnalyticsSummary(7),
    prisma.notificationLog.groupBy({
      by: ["channel", "status"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, utmCampaign: { not: null } },
      select: { utmCampaign: true, utmSource: true, utmMedium: true, type: true },
      take: 500,
    }),
  ]);

  const instagram30 = analytics30.topSources.find((s) => s.source.toLowerCase().includes("instagram"));
  const instagram7 = analytics7.topSources.find((s) => s.source.toLowerCase().includes("instagram"));
  const instagramChange =
    instagram30 && instagram7
      ? Math.round(((instagram7.visits * 4 - instagram30.visits) / Math.max(instagram30.visits, 1)) * 100)
      : 0;

  await writeMemory({
    workspaceId,
    layer: "marketing",
    category: "channel_roi",
    key: `channels-${period}`,
    title: "Marketing channel performance",
    summary: `Top: ${analytics30.topSources[0]?.source ?? "Direct"} · Instagram: ${instagram30?.visits ?? 0} visits · ${analytics30.totals.conversionRate}% site conversion`,
    value: {
      period,
      topSources: analytics30.topSources,
      conversions: analytics30.conversions,
      conversionRate: analytics30.totals.conversionRate,
      instagram: { visits30: instagram30?.visits ?? 0, trend: instagramChange },
      topPages: analytics30.topPages.slice(0, 5),
    },
    confidence: 0.88,
    importance: 82,
    source: "sync",
    sourceRef: "analytics-server",
  });
  synced += 1;

  const emailStats = notifications.filter((n) => n.channel === "email");
  const emailSent = emailStats.filter((n) => n.status === "sent").reduce((s, n) => s + n._count.id, 0);
  const emailFailed = emailStats.filter((n) => n.status === "failed").reduce((s, n) => s + n._count.id, 0);

  await writeMemory({
    workspaceId,
    layer: "marketing",
    category: "email_delivery",
    key: `notifications-${period}`,
    title: "Email & notification delivery",
    summary: `${emailSent} sent · ${emailFailed} failed in 30 days`,
    value: {
      emailSent,
      emailFailed,
      byChannel: notifications.map((n) => ({
        channel: n.channel,
        status: n.status,
        count: n._count.id,
      })),
    },
    confidence: 0.95,
    importance: 70,
    source: "sync",
    sourceRef: "notification-log",
  });
  synced += 1;

  const campaignMap = new Map<string, { views: number; conversions: number }>();
  for (const e of utmEvents) {
    const key = `${e.utmSource ?? "unknown"}:${e.utmCampaign ?? "none"}`;
    const cur = campaignMap.get(key) ?? { views: 0, conversions: 0 };
    if (e.type === "pageview") cur.views += 1;
    if (e.type === "conversion") cur.conversions += 1;
    campaignMap.set(key, cur);
  }

  const topCampaigns = [...campaignMap.entries()]
    .sort((a, b) => b[1].conversions - a[1].conversions || b[1].views - a[1].views)
    .slice(0, 6);

  if (topCampaigns.length > 0) {
    await writeMemory({
      workspaceId,
      layer: "marketing",
      category: "utm_campaigns",
      key: `campaigns-${period}`,
      title: "UTM campaign performance",
      summary: `${topCampaigns.length} tracked campaigns · best: ${topCampaigns[0][0]}`,
      value: {
        campaigns: topCampaigns.map(([name, stats]) => ({
          name,
          ...stats,
          conversionRate: stats.views > 0 ? Math.round((stats.conversions / stats.views) * 1000) / 10 : 0,
        })),
      },
      confidence: 0.75,
      importance: 78,
      source: "sync",
      sourceRef: "utm-analytics",
    });
    synced += 1;
  }

  const cmo = await syncCMOMemory().catch(() => ({ synced: 0 }));
  synced += cmo.synced;

  return { synced, layers: [...layers] };
}
