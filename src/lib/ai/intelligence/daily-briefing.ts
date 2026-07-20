import { getProactiveBusinessInsights, getOperatorMetrics } from "./business-operator";
import { syncBusinessMemory } from "../memory/sync";
import { computeExecutiveScores, legacyScoresFromExecutive } from "./executive-scores";
import { getAllExecutiveOpportunities } from "./website-opportunities";
import { getExecutiveRisks } from "./risk-center";
import { getLearningOutcomes } from "../memory/learning";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminDashboardOSCached, getAdminCRMContacts, getAdminPipeline } from "@/lib/admin-os-server";
import { getSiteConfig } from "@/lib/content";
import { prisma } from "@/lib/db";
import { getCached, setCache } from "../cache";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";
import { systemPromptForTask } from "../prompts/system";
import type { AIDailyBriefing } from "../types";
import type { CMODailyBriefing } from "../marketing/types";
import { buildExecutiveMorningBrief } from "./intelligence-suite";
import { buildExecutiveReportV2 } from "../platform/build-executive-report-v2";
import {
  buildExecutiveRecommendation,
  buildPredictionContract,
  toRecommendationContract,
} from "../platform/recommendation-contract";
import type { PrioritizedRecommendation } from "../types";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export async function getAIDailyBriefing(force = false): Promise<AIDailyBriefing> {
  const cacheKey = "daily-briefing-v10-command";
  if (!force) {
    const cached = await getCached<AIDailyBriefing>(cacheKey);
    if (cached) return cached;
  } else {
    syncBusinessMemory().catch(() => {});
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = startOfWeek(now);

  const [
    operatorMetrics,
    proactiveInsights,
    dashboard,
    crm,
    pipeline,
    bookingsYesterday,
    staleBookings,
    upcomingSessions,
    opportunities,
    risks,
    learnings,
    analytics30,
    reportV2,
    morningBrief,
    cmoResult,
  ] = await Promise.all([
    getOperatorMetrics(),
    getProactiveBusinessInsights(),
    getAdminDashboardOSCached(),
    getAdminCRMContacts(),
    getAdminPipeline(),
    prisma.submission.count({
      where: { type: "booking", createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.submission.findMany({
      where: {
        type: "booking",
        status: { in: ["new", "contacted", "lead", "qualified", "discovery", "proposal"] },
        updatedAt: { lt: new Date(Date.now() - 3 * 86400000) },
      },
      take: 10,
      select: { id: true, contactEmail: true, data: true, createdAt: true, updatedAt: true, status: true },
    }),
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false, status: { in: ["applications_open", "upcoming", "live"] } },
      orderBy: { sessionDate: "asc" },
      take: 5,
      select: { id: true, title: true, volumeNumber: true, sessionDate: true, status: true },
    }),
    getAllExecutiveOpportunities(),
    getExecutiveRisks(),
    getLearningOutcomes(undefined, 5),
    getAnalyticsSummary(30),
    buildExecutiveReportV2("daily_ceo").catch(() => null),
    buildExecutiveMorningBrief().catch(() => null),
    import("../marketing/cmo-intelligence")
      .then((m) => m.getCMOIntelligence(false))
      .catch(() => null),
  ]);

  const executiveMorning = morningBrief ?? undefined;
  const cmoBriefing: CMODailyBriefing | undefined = cmoResult?.briefing;

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
    operatorMetrics.attention.abandonedInquiries > 0
      ? `Recover ${operatorMetrics.attention.abandonedInquiries} abandoned booking inquiries today`
      : null,
    inactiveClients.length > 0 ? `Re-engage ${inactiveClients.length} inactive clients (~$${operatorMetrics.attention.followUpValue.toLocaleString()})` : null,
    dashboard.metrics.applications.pending > 0
      ? `Review ${dashboard.metrics.applications.pending} session applications`
      : null,
    operatorMetrics.attention.galleriesAwaiting > 0
      ? `Follow up on ${operatorMetrics.attention.galleriesAwaiting} booked projects idle 14+ days (delivery check)`
      : null,
    proactiveInsights[0]?.title ?? null,
  ].filter(Boolean) as string[];

  const executiveScores = computeExecutiveScores(operatorMetrics);
  const scores = legacyScoresFromExecutive(executiveScores);

  const potentialLostRevenue =
    operatorMetrics.attention.followUpValue +
    operatorMetrics.attention.abandonedInquiries * 1200;
  const projectedMonthlyRevenue = Math.round(
    operatorMetrics.revenue.thisMonth * (1 + Math.max(operatorMetrics.revenue.monthChange, -30) / 100)
  );

  const topInsight = proactiveInsights[0];
  const highestRoiAction = topInsight
    ? {
        title: topInsight.title,
        why: topInsight.why,
        revenueImpact: topInsight.revenueImpact ?? potentialLostRevenue,
        timeSavedMinutes: topInsight.timeSavedMinutes ?? 25,
        href: topInsight.actions[0]?.href ?? "/admin/insights",
        actionLabel: topInsight.actions[0]?.label ?? "Take action",
      }
    : null;

  const siteConfig = await getSiteConfig().catch(() => null);
  const creator = siteConfig?.creator?.trim() || "Bill";

  const aiRecommendations = proactiveInsights.slice(0, 5).map((i) => i.title);

  const revenueTodayLabel = operatorMetrics.revenue.verified
    ? "settled cash"
    : "pipeline estimate";
  const revenueMonthLabel = operatorMetrics.revenue.verified
    ? "settled cash MTD"
    : "pipeline estimate MTD";

  let summary = `Good morning, ${creator}. Today: ${operatorMetrics.today.bookings} booking${operatorMetrics.today.bookings === 1 ? "" : "s"}, ${operatorMetrics.today.applications} application${operatorMetrics.today.applications === 1 ? "" : "s"}, ~$${operatorMetrics.revenue.today.toLocaleString()} ${revenueTodayLabel}. This month: ~$${operatorMetrics.revenue.thisMonth.toLocaleString()} ${revenueMonthLabel} (${operatorMetrics.revenue.monthChange >= 0 ? "+" : ""}${operatorMetrics.revenue.monthChange}%). ${operatorMetrics.attention.followUpClients} clients need follow-up. Top priority: ${weeklyPriorities[0] ?? "Protect speed-to-lead"}.`;
  let provider: AIDailyBriefing["provider"] = "rules";

  if (isAIConfigured()) {
    try {
      const result = await aiComplete({
        task: "executive_summary",
        messages: [
          {
            role: "system",
            content: systemPromptForTask(
              `You are the CEO briefing voice for ÉLEVÉ Visuals, addressing ${creator} by name. Write a 3–5 sentence executive morning briefing. Open with "Good morning, ${creator}." Lead with what is happening, why it matters, and what should happen next. Use only numbers from the provided JSON. Never invent ROI, conversion lifts, benchmarks, or projections. If a figure is missing, say data is limited. Do not present AI analysis as measured fact.`
            ),
          },
          {
            role: "user",
            content: JSON.stringify({
              creator,
              revenueToday: operatorMetrics.revenue.today,
              revenueMonth: operatorMetrics.revenue.thisMonth,
              revenueChange: operatorMetrics.revenue.monthChange,
              bookingsToday: operatorMetrics.today.bookings,
              leadsToday: operatorMetrics.today.leads,
              applicationsToday: operatorMetrics.today.applications,
              followUpClients: operatorMetrics.attention.followUpClients,
              followUpValue: operatorMetrics.attention.followUpValue,
              abandonedInquiries: operatorMetrics.attention.abandonedInquiries,
              trafficChange: operatorMetrics.traffic.trafficChange,
              conversionRate: operatorMetrics.traffic.conversionRate,
              topPriority: weeklyPriorities[0],
              topInsights: proactiveInsights.slice(0, 3).map((i) => i.title),
            }),
          },
        ],
        maxTokens: 450,
      });
      if (result?.content) {
        summary = result.content;
        provider = result.provider;
      }
    } catch {
      /* keep rule summary */
    }
  }

  const ceoHeadline =
    operatorMetrics.attention.abandonedInquiries > 0
      ? `${operatorMetrics.attention.abandonedInquiries} inquiries need recovery · $${operatorMetrics.revenue.thisMonth.toLocaleString()} MTD pipeline`
      : operatorMetrics.attention.followUpClients > 0
        ? `$${operatorMetrics.attention.followUpValue.toLocaleString()} in inactive client value · ${operatorMetrics.month.bookings} bookings this month`
        : `${operatorMetrics.month.bookings} bookings · ${operatorMetrics.traffic.visitors30} visitors · ${operatorMetrics.traffic.conversionRate}% conversion`;

  const commandRecommendations = opportunities.slice(0, 5).map((o) => {
    const prioritized: PrioritizedRecommendation = {
      id: o.id,
      title: o.title,
      detail: o.detail,
      category: o.category,
      estimatedRevenue: o.expectedRevenue,
      confidence: o.confidence,
      timeToCompleteMinutes: o.estimatedMinutes,
      difficulty: o.effort === "low" ? "easy" : o.effort === "high" ? "hard" : "moderate",
      priority:
        o.urgency === "critical"
          ? "critical"
          : o.urgency === "high"
            ? "high"
            : o.urgency === "low"
              ? "low"
              : "medium",
      whyNow: o.why,
      evidence: o.evidence,
      actions: o.actions,
    };
    return toRecommendationContract(
      buildExecutiveRecommendation(prioritized, { owner: o.owner ?? "Studio owner" })
    );
  });

  const commandContract: NonNullable<AIDailyBriefing["commandContract"]> = {
    measuredFacts: [
      {
        label: "Bookings today",
        value: String(operatorMetrics.today.bookings),
        evidence: ["Submission.type=booking created today (Measured)"],
      },
      {
        label: "Bookings MTD",
        value: String(operatorMetrics.month.bookings),
        evidence: [`${operatorMetrics.month.bookingsChange}% vs prior month (Measured)`],
      },
      {
        label: "Visitors (30d)",
        value: String(operatorMetrics.traffic.visitors30),
        evidence: [`Owned by Analytics · top page ${operatorMetrics.traffic.topPage}`],
      },
      {
        label: "Stale inquiries",
        value: String(operatorMetrics.attention.abandonedInquiries),
        evidence: ["Inquiries in new/contacted untouched 3+ days (Measured)"],
      },
    ],
    whatChanged: [
      {
        label: "Booking volume",
        detail: `Bookings ${operatorMetrics.month.bookingsChange >= 0 ? "increased" : "decreased"} ${Math.abs(operatorMetrics.month.bookingsChange)}% vs last month.`,
        evidence: [`${operatorMetrics.month.bookings} bookings this month`],
      },
      {
        label: "Traffic",
        detail:
          operatorMetrics.traffic.visitors7 === 0
            ? "No weekly traffic signal yet — change explanation unavailable."
            : `Traffic ${operatorMetrics.traffic.trafficChange >= 0 ? "up" : "down"} ${Math.abs(operatorMetrics.traffic.trafficChange)}% week-over-week.`,
        evidence: [`${operatorMetrics.traffic.visitors7} visitors this week`],
      },
    ],
    why: [
      {
        statement:
          operatorMetrics.attention.abandonedInquiries > 0
            ? "Slow response on open inquiries is the primary operational drag visible in measured submission timestamps."
            : operatorMetrics.month.bookingsChange < 0
              ? "Fewer booking submissions this month reduced top-of-funnel volume versus the prior period."
              : "No single high-severity change dominates — protect speed-to-lead and keep pipeline hygiene.",
        evidence: [
          `${operatorMetrics.attention.abandonedInquiries} stale inquiries`,
          `${operatorMetrics.month.bookingsChange}% booking MoM`,
        ],
      },
    ],
    evidence: [
      "Submission counts and statuses (Measured)",
      "Analytics unique sessions (Calculated)",
      "Pipeline dollars are Estimated unless Payment-settled",
    ],
    predictions: [
      buildPredictionContract({
        id: "pred-followup-recovery",
        prediction:
          operatorMetrics.attention.abandonedInquiries > 0
            ? "Recovering stale inquiries may improve consultation volume if response latency is the binding constraint."
            : "Maintaining current response latency should keep inquiry conversion stable.",
        probability: operatorMetrics.attention.abandonedInquiries > 0 ? 0.62 : 0.55,
        confidence: 0.58,
        reasons: [
          "Supported by internal stale-inquiry counts",
          "Historical ÉLEVÉ follow-up outcomes are limited",
        ],
        unknowns: [
          "No studio-specific close-rate after follow-up is recorded yet",
          "No A/B test on response-time SLA",
        ],
      }),
    ],
    recommendations: commandRecommendations,
    confidence: {
      overall: Math.round(
        (commandRecommendations.reduce((s, r) => s + r.confidence, 0) /
          Math.max(commandRecommendations.length, 1)) *
          100
      ) / 100,
      why: [
        "Confidence reflects evidence completeness, not wishful impact",
        "Dollar recovery remains Predicted until Payment outcomes are linked",
      ],
    },
    actions: commandRecommendations.flatMap((r) =>
      r.actions.slice(0, 1).map((a) => ({
        id: `${r.id}-${a.id}`,
        label: a.label,
        href: a.href,
        evidence: r.evidence,
      }))
    ),
  };

  const briefing: AIDailyBriefing = {
    generatedAt: now.toISOString(),
    provider,
    summary,
    ceoHeadline,
    yesterday: {
      revenue: revenueYesterday,
      bookings: bookingsYesterday,
    },
    today: { ...operatorMetrics.today, revenue: operatorMetrics.revenue.today },
    month: {
      revenue: operatorMetrics.revenue.thisMonth,
      revenueChange: operatorMetrics.revenue.monthChange,
      bookings: operatorMetrics.month.bookings,
      bookingsChange: operatorMetrics.month.bookingsChange,
    },
    traffic: {
      visitors30: operatorMetrics.traffic.visitors30,
      conversionRate: operatorMetrics.traffic.conversionRate,
      conversionChange: operatorMetrics.traffic.conversionChange,
      topPage: operatorMetrics.traffic.topPage,
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
          daysSince: Math.round((Date.now() - b.updatedAt.getTime()) / 86400000),
          href: `/admin/submissions?type=booking&focus=${b.id}`,
        };
      }),
      expiringFollowUps: staleBookings.length,
      galleriesAwaiting: operatorMetrics.attention.galleriesAwaiting,
      overdueInvoices: operatorMetrics.attention.overdueInvoices,
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
    executiveScores,
    intelligence: {
      opportunities: opportunities.slice(0, 6),
      risks: risks.slice(0, 5),
      clientsNeedingAttention: inactiveClients.slice(0, 8).map((c) => ({
        name: c.name,
        email: c.email,
        daysSince: Math.round((Date.now() - new Date(c.lastActivity).getTime()) / 86400000),
        reason: "No activity in 60+ days",
      })),
      marketingRecommendations: proactiveInsights
        .filter((i) => i.category === "marketing")
        .slice(0, 4)
        .map((i) => i.title),
      recentLearnings: learnings.map((l) => l.outcome),
      websitePerformance: {
        summary: `${operatorMetrics.traffic.visitors30} visitors (30d), ${operatorMetrics.traffic.conversionRate}% conversion (${operatorMetrics.traffic.conversionChange >= 0 ? "+" : ""}${operatorMetrics.traffic.conversionChange}%)`,
        conversionRate: operatorMetrics.traffic.conversionRate,
        topPage: operatorMetrics.traffic.topPage,
      },
      portfolioPerformance: {
        summary: (() => {
          const p = analytics30.topPages.find((pg) => pg.path.includes("/portfolio"));
          return p
            ? `Portfolio ${p.path}: ${p.views} views this month`
            : "Portfolio traffic data limited — publish or feature work to measure.";
        })(),
      },
      sessionsPerformance: {
        summary: (() => {
          const s = analytics30.topPages.find((pg) => pg.path.includes("/sessions"));
          return s
            ? `Sessions page: ${s.views} views · ${dashboard.metrics.applications.pending} applications pending review`
            : `${dashboard.metrics.applications.pending} applications pending · promote open volumes`;
        })(),
      },
    },
    executive: {
      highestRoiAction,
      projectedMonthlyRevenue,
      potentialLostRevenue,
      pipelineValue: pipeline.totalValue,
    },
    recommendedActions: proactiveInsights.slice(0, 8).map((i) => ({
      id: i.id,
      severity: i.severity,
      title: i.title,
      detail: i.detail,
      why: i.why,
      action: i.actions[0]?.label ?? "Take action",
      href: i.actions[0]?.href ?? "/admin/insights",
      actions: i.actions,
      category: i.category,
      metric: i.metric,
      revenueImpact: i.revenueImpact,
      timeSavedMinutes: i.timeSavedMinutes,
      priority: i.priority,
    })),
    aiRecommendations,
    forecast: {
      bookings: operatorMetrics.month.bookingsChange >= 0 ? "stable to growing" : "needs attention",
      revenue: pipeline.totalValue,
      weekStart: weekStart.toISOString(),
    },
    cmo: cmoBriefing,
    executiveMorning,
    commandContract,
    ...(reportV2 ? { reportV2 } : {}),
  };

  await setCache(cacheKey, briefing, 15 * 60 * 1000);
  return briefing;
}
