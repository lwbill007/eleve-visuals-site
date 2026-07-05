import { getLearningOutcomes } from "../memory/learning";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import type { BusinessTimelineEvent } from "../types";
import { getOperatorMetrics } from "./business-operator";
import { prisma } from "@/lib/db";

export async function getBusinessTimeline(limit = 20): Promise<BusinessTimelineEvent[]> {
  const [outcomes, metrics, analytics30] = await Promise.all([
    getLearningOutcomes(undefined, 15),
    getOperatorMetrics(),
    getAnalyticsSummary(90),
  ]);

  const events: BusinessTimelineEvent[] = outcomes.map((o) => ({
    id: o.id,
    date: o.createdAt,
    title: o.outcome,
    detail: o.hypothesis || `${o.domain} — ${o.actionType}`,
    category: "learning" as const,
    impact: o.revenueImpact ? `~$${o.revenueImpact.toLocaleString()}` : undefined,
    source: "AI learning outcome",
    verified: o.confidence >= 0.7,
    memoryId: o.memoryIds[0],
  }));

  if (metrics.month.bookingsChange >= 15) {
    events.push({
      id: "milestone-bookings-up",
      date: metrics.generatedAt,
      title: `Bookings increased ${metrics.month.bookingsChange}% this month`,
      detail: `${metrics.month.bookings} inquiries vs prior month — momentum building.`,
      category: "revenue",
      impact: `$${metrics.revenue.thisMonth.toLocaleString()} MTD`,
      source: "Submission analytics",
      verified: true,
    });
  }

  if (metrics.traffic.instagramChange >= 50 && metrics.traffic.instagramReferrals > 0) {
    events.push({
      id: "milestone-instagram",
      date: metrics.generatedAt,
      title: "Instagram growth accelerated",
      detail: `${metrics.traffic.instagramReferrals} referrals (${metrics.traffic.instagramChange >= 0 ? "+" : ""}${metrics.traffic.instagramChange}%).`,
      category: "marketing",
      source: "Analytics",
      verified: true,
    });
  }

  const portfolioTop = analytics30.topPages.find((p) => p.path.includes("/portfolio"));
  if (portfolioTop && portfolioTop.views > 30) {
    events.push({
      id: "timeline-portfolio",
      date: new Date().toISOString(),
      title: "Portfolio driving traffic",
      detail: `${portfolioTop.path} — ${portfolioTop.views} views in 90 days.`,
      category: "portfolio",
      source: "Analytics",
      verified: true,
    });
  }

  const recentCompleted = await prisma.submission.count({
    where: { type: "booking", status: "completed", updatedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
  });
  if (recentCompleted >= 3) {
    events.push({
      id: "timeline-completed",
      date: new Date().toISOString(),
      title: `${recentCompleted} bookings completed this month`,
      detail: "Delivery and client experience milestones logged.",
      category: "milestone",
      source: "Submissions",
      verified: true,
    });
  }

  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
