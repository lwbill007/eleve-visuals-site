import {
  getAdminCRMContacts,
  getAdminDashboardOS,
  getAdminInsights,
  getAdminPipeline,
} from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import { getCached, setCache } from "../cache";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";
import { systemPromptForTask } from "../prompts/system";
import type { AIDailyBriefing } from "../types";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export async function getAIDailyBriefing(force = false): Promise<AIDailyBriefing> {
  const cacheKey = "daily-briefing";
  if (!force) {
    const cached = await getCached<AIDailyBriefing>(cacheKey);
    if (cached) return cached;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = startOfWeek(now);

  const [
    dashboard,
    insights,
    crm,
    pipeline,
    analytics,
    bookingsToday,
    bookingsYesterday,
    leadsToday,
    appsToday,
    contactsToday,
    upcomingSessions,
    staleBookings,
  ] = await Promise.all([
    getAdminDashboardOS(),
    getAdminInsights(),
    getAdminCRMContacts(),
    getAdminPipeline(),
    getAnalyticsSummary(30),
    prisma.submission.count({ where: { type: "booking", createdAt: { gte: todayStart } } }),
    prisma.submission.count({
      where: { type: "booking", createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.submission.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { type: "session", createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { type: "contact", createdAt: { gte: todayStart } } }),
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false, status: { in: ["applications_open", "upcoming", "live"] } },
      orderBy: { sessionDate: "asc" },
      take: 5,
      select: { id: true, title: true, volumeNumber: true, sessionDate: true, status: true },
    }),
    prisma.submission.findMany({
      where: {
        type: "booking",
        status: { in: ["new", "contacted"] },
        createdAt: { lt: new Date(Date.now() - 3 * 86400000) },
      },
      take: 10,
      select: { id: true, contactEmail: true, data: true, createdAt: true, status: true },
    }),
  ]);

  const inactiveClients = crm.filter((c) => {
    const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
    return days > 60 && ["completed", "repeat", "vip"].includes(c.status);
  });

  const revenueYesterday = pipeline.columns
    .flatMap((c) => c.items)
    .filter((i) => {
      const d = new Date(i.createdAt);
      return d >= yesterdayStart && d < todayStart;
    })
    .reduce((s, i) => s + i.value, 0);

  const weeklyPriorities = [
    dashboard.metrics.bookings.pending > 0
      ? `Follow up on ${dashboard.metrics.bookings.pending} open booking inquiries`
      : null,
    inactiveClients.length > 0
      ? `Re-engage ${inactiveClients.length} inactive clients`
      : null,
    dashboard.metrics.applications.pending > 0
      ? `Review ${dashboard.metrics.applications.pending} session applications`
      : null,
    staleBookings.length > 0 ? `Recover ${staleBookings.length} abandoned booking inquiries` : null,
    insights.insights[0]?.title ?? null,
  ].filter(Boolean) as string[];

  const businessHealth = Math.round(
    (Math.min(100, Math.max(20, 70 + dashboard.metrics.monthlyGrowth)) +
      Math.min(100, dashboard.metrics.conversionRate * 8) +
      Math.min(100, 100 - dashboard.metrics.pendingTasks * 6)) /
      3
  );

  const scores = {
    businessHealth,
    marketing: Math.min(100, Math.max(15, Math.round(analytics.totals.conversionRate * 8))),
    sales: Math.min(100, Math.max(10, 100 - dashboard.metrics.bookings.pending * 4)),
    productivity: Math.min(100, Math.max(10, 100 - dashboard.metrics.pendingTasks * 7)),
    customerSatisfaction: Math.min(
      100,
      Math.max(20, Math.round((dashboard.metrics.returningClients / Math.max(crm.length, 1)) * 100 + 40))
    ),
  };

  let summary = `Yesterday: ${bookingsYesterday} new booking${bookingsYesterday === 1 ? "" : "s"}, ~$${revenueYesterday.toLocaleString()} pipeline value. Today: ${bookingsToday} booking${bookingsToday === 1 ? "" : "s"}, ${appsToday} application${appsToday === 1 ? "" : "s"}, ${contactsToday} new contact${contactsToday === 1 ? "" : "s"}. ${inactiveClients.length} client${inactiveClients.length === 1 ? "" : "s"} need follow-up.`;
  let provider: AIDailyBriefing["provider"] = "rules";

  if (isAIConfigured()) {
    try {
      const result = await aiComplete({
        messages: [
          {
            role: "system",
            content: systemPromptForTask(
              "Write a 3-sentence executive morning briefing. Lead with what matters most today. Be specific with numbers."
            ),
          },
          {
            role: "user",
            content: JSON.stringify({
              revenueYesterday,
              bookingsYesterday,
              bookingsToday,
              leadsToday,
              appsToday,
              contactsToday,
              inactiveCount: inactiveClients.length,
              staleBookings: staleBookings.length,
              pendingTasks: dashboard.metrics.pendingTasks,
              growth: dashboard.metrics.monthlyGrowth,
            }),
          },
        ],
        maxTokens: 400,
      });
      if (result?.content) {
        summary = result.content;
        provider = result.provider;
      }
    } catch {
      /* keep rule summary */
    }
  }

  const briefing: AIDailyBriefing = {
    generatedAt: now.toISOString(),
    provider,
    summary,
    yesterday: {
      revenue: revenueYesterday,
      bookings: bookingsYesterday,
    },
    today: {
      bookings: bookingsToday,
      leads: leadsToday,
      applications: appsToday,
      subscribers: contactsToday,
    },
    followUp: {
      inactiveClients: inactiveClients.slice(0, 8).map((c) => ({
        name: c.name,
        email: c.email,
        daysSince: Math.round((Date.now() - new Date(c.lastActivity).getTime()) / 86400000),
      })),
      staleBookings: staleBookings.map((b) => {
        let name = b.contactEmail;
        try {
          const d = JSON.parse(b.data) as Record<string, unknown>;
          name = String(d.fullName || d.name || b.contactEmail);
        } catch {
          /* ignore */
        }
        return {
          id: b.id,
          name,
          daysSince: Math.round((Date.now() - b.createdAt.getTime()) / 86400000),
          href: `/admin/submissions?type=booking&focus=${b.id}`,
        };
      }),
      expiringFollowUps: staleBookings.length,
    },
    upcomingSessions: upcomingSessions.map((s) => ({
      id: s.id,
      title: `Vol. ${s.volumeNumber} — ${s.title}`,
      date: s.sessionDate,
      status: s.status,
      href: "/admin/sessions",
    })),
    weeklyPriorities: weeklyPriorities.slice(0, 5),
    scores,
    recommendedActions: insights.insights.slice(0, 6),
    forecast: {
      bookings: dashboard.metrics.monthlyGrowth >= 0 ? "stable to growing" : "needs attention",
      revenue: pipeline.totalValue,
      weekStart: weekStart.toISOString(),
    },
  };

  await setCache(cacheKey, briefing, 15 * 60 * 1000);
  return briefing;
}
