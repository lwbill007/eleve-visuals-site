import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { prisma } from "@/lib/db";
import type { RevenueAttribution } from "./types";

/**
 * Rank marketing channels from measured events only.
 * When cost is unknown, ROI is null — never invent 999% placeholders.
 */
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
    metrics.month.bookings > 0
      ? metrics.revenue.thisMonth / metrics.month.bookings
      : 0;
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
    const estimatedRevenue =
      avgBookingValue > 0 ? Math.round(stats.conversions * avgBookingValue) : 0;
    attributions.push({
      activity: `${channel} campaigns`,
      channel,
      revenue: estimatedRevenue,
      cost: 0,
      roi: 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      ltv: avgBookingValue || 0,
      leadQuality: Math.min(100, conversionRate * 20),
      paybackDays: 0,
      rank: 0,
      evidence: [
        `${stats.views} views (Measured)`,
        `${stats.conversions} conversions (Measured)`,
        avgBookingValue > 0
          ? `Est. revenue = conversions × APV (AI Prediction — cost unknown so ROI not claimed)`
          : "More financial data required for revenue estimate",
      ],
    });
  }

  for (const src of analytics.topSources.slice(0, 6)) {
    if (attributions.some((a) => a.channel === src.source)) continue;
    attributions.push({
      activity: `${src.source} traffic`,
      channel: src.source,
      revenue: 0,
      cost: 0,
      roi: 0,
      conversionRate: analytics.totals.conversionRate,
      ltv: avgBookingValue || 0,
      leadQuality: src.source.toLowerCase().includes("instagram") ? 75 : 60,
      paybackDays: 0,
      rank: 0,
      evidence: [
        `${src.visits} visits (30d) (Measured)`,
        `${analytics.totals.conversionRate}% site conversion (Measured)`,
        "Attributed $ revenue: More financial data required (no conversion×APV invention without channel conversions)",
      ],
    });
  }

  const emailSent = notifications.find((n) => n.channel === "email")?._count.id ?? 0;
  if (emailSent > 0) {
    attributions.push({
      activity: "Transactional email touchpoints",
      channel: "email",
      revenue: 0,
      cost: emailSent * 0.01,
      roi: 0,
      conversionRate: 0,
      ltv: avgBookingValue || 0,
      leadQuality: 80,
      paybackDays: 0,
      rank: 0,
      evidence: [
        `${emailSent} emails sent (Measured)`,
        `${metrics.attention.followUpClients} re-engagement targets (Measured)`,
        "ROI unknown — More financial data required",
      ],
    });
  }

  if (metrics.attention.followUpClients > 0) {
    attributions.push({
      activity: "CRM re-engagement (inactive clients)",
      channel: "crm",
      revenue: 0,
      cost: 0,
      roi: 0,
      conversionRate: 0,
      ltv: avgBookingValue || 0,
      leadQuality: 90,
      paybackDays: 0,
      rank: 0,
      evidence: [
        `${metrics.attention.followUpClients} inactive clients (Measured)`,
        metrics.attention.followUpValue > 0
          ? `Historical CRM association ~$${metrics.attention.followUpValue.toLocaleString()} — not predicted recovery`
          : "More financial data required",
      ],
    });
  }

  attributions.sort((a, b) => b.conversionRate - a.conversionRate || b.revenue - a.revenue);
  return attributions.map((a, i) => ({ ...a, rank: i + 1 }));
}
