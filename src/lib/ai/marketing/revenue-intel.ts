import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { prisma } from "@/lib/db";
import type { RevenueAttribution } from "./types";

export async function rankMarketingRevenue(): Promise<RevenueAttribution[]> {
  const since = new Date(Date.now() - 90 * 86400000);

  const [metrics, analytics, utmEvents, notifications] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, utmCampaign: { not: null } },
      select: { utmSource: true, utmCampaign: true, utmMedium: true, type: true },
    }),
    prisma.notificationLog.groupBy({
      by: ["channel"],
      where: { createdAt: { gte: since }, status: "sent" },
      _count: { id: true },
    }),
  ]);

  const avgBookingValue =
    metrics.revenue.thisMonth / Math.max(metrics.month.bookings, 1) || 1500;
  const attributions: RevenueAttribution[] = [];

  const channelMap = new Map<string, { views: number; conversions: number }>();
  for (const e of utmEvents) {
    const ch = e.utmSource ?? "direct";
    const cur = channelMap.get(ch) ?? { views: 0, conversions: 0 };
    if (e.type === "pageview") cur.views += 1;
    if (e.type === "conversion") cur.conversions += 1;
    channelMap.set(ch, cur);
  }

  for (const [channel, stats] of channelMap) {
    const conversionRate = stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0;
    const estimatedRevenue = Math.round(stats.conversions * avgBookingValue);
    attributions.push({
      activity: `${channel} campaigns`,
      channel,
      revenue: estimatedRevenue,
      cost: 0,
      roi: estimatedRevenue > 0 ? 999 : 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      ltv: avgBookingValue * 1.2,
      leadQuality: Math.min(100, conversionRate * 20),
      paybackDays: 0,
      rank: 0,
      evidence: [`${stats.views} views`, `${stats.conversions} conversions`, `Est. $${estimatedRevenue}`],
    });
  }

  for (const src of analytics.topSources.slice(0, 6)) {
    const estLeads = Math.round(src.visits * (analytics.totals.conversionRate / 100));
    const estRevenue = Math.round(estLeads * avgBookingValue);
    if (attributions.some((a) => a.channel === src.source)) continue;
    attributions.push({
      activity: `${src.source} traffic`,
      channel: src.source,
      revenue: estRevenue,
      cost: 0,
      roi: estRevenue > 0 ? 500 : 0,
      conversionRate: analytics.totals.conversionRate,
      ltv: avgBookingValue,
      leadQuality: src.source.toLowerCase().includes("instagram") ? 75 : 60,
      paybackDays: 14,
      rank: 0,
      evidence: [`${src.visits} visits (30d)`, `${analytics.totals.conversionRate}% site conversion`],
    });
  }

  const emailSent = notifications.find((n) => n.channel === "email")?._count.id ?? 0;
  if (emailSent > 0) {
    attributions.push({
      activity: "Transactional email touchpoints",
      channel: "email",
      revenue: Math.round(metrics.attention.followUpValue * 0.1),
      cost: emailSent * 0.01,
      roi: 400,
      conversionRate: 5,
      ltv: avgBookingValue,
      leadQuality: 80,
      paybackDays: 7,
      rank: 0,
      evidence: [`${emailSent} emails sent`, `${metrics.attention.followUpClients} re-engagement targets`],
    });
  }

  attributions.push({
    activity: "CRM re-engagement (inactive clients)",
    channel: "crm",
    revenue: metrics.attention.followUpValue,
    cost: 50,
    roi: Math.round((metrics.attention.followUpValue / 50) * 100),
    conversionRate: 8,
    ltv: avgBookingValue * 1.5,
    leadQuality: 90,
    paybackDays: 3,
    rank: 0,
    evidence: [
      `${metrics.attention.followUpClients} inactive clients`,
      `~$${metrics.attention.followUpValue.toLocaleString()} potential`,
    ],
  });

  attributions.sort((a, b) => b.revenue - a.revenue || b.roi - a.roi);
  return attributions.map((a, i) => ({ ...a, rank: i + 1 }));
}
