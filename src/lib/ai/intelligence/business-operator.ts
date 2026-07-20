import {
  getAdminCRMContacts,
  getAdminDashboardOSCached,
  getAdminPipeline,
} from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import { dollarsFromCents, getPaymentRevenueSummary } from "@/lib/payments";
import { normalizeApplicationStatus } from "@/lib/types";
import type {
  BusinessAction,
  BusinessInsight,
  CommandCenterHub,
  MarketingRecommendation,
  SalesRecommendation,
  SelfImprovementItem,
  SessionsOperatorIntel,
} from "../types";
import { layerForInsightCategory } from "../memory/sync";
import { writeMemory } from "../memory/store";
import { getCached, setCache, withInflight } from "../cache";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Week-over-week % with sane caps — avoids 1000% spikes from tiny baselines. */
function weekOverWeekPct(current7: number, previous7: number): number {
  if (previous7 < 5) return current7 >= 10 ? 100 : 0;
  return Math.min(200, Math.max(-90, pctChange(current7, previous7)));
}

function viewsInPeriod(
  pages: { path: string; views: number }[],
  pathPrefix: string
): number {
  return pages
    .filter((p) => p.path === pathPrefix || p.path.startsWith(`${pathPrefix}/`))
    .reduce((s, p) => s + p.views, 0);
}

function sourceVisits(
  sources: { source: string; visits: number }[],
  needle: string
): number {
  return sources.find((s) => s.source.toLowerCase().includes(needle))?.visits ?? 0;
}

function estimateInquiryRevenue(
  views: number,
  conversionRate: number,
  avgBookingValue: number,
  uplift = 1
): number {
  const inquiries = views * (conversionRate / 100) * uplift;
  return Math.round(inquiries * avgBookingValue);
}

function action(
  id: string,
  label: string,
  type: BusinessAction["type"],
  href: string,
  extra?: Partial<BusinessAction>
): BusinessAction {
  return { id, label, type, href, ...extra };
}

/** Working routes — avoid dead-end scaffold pages for one-click actions */
export const OS_ROUTES = {
  marketingFollowUp: "/admin/marketing?task=follow_up",
  marketingCampaign: "/admin/marketing?task=campaign",
  marketingEmail: "/admin/marketing?task=email_body",
  marketingReferral: "/admin/marketing?task=campaign&focus=referral",
  marketingGallery: "/admin/marketing?task=follow_up&focus=gallery-delivery",
  crm: "/admin/crm",
  pipeline: "/admin/pipeline",
  automations: "/admin/automations",
  notifications: "/admin/notifications",
} as const;

function parseMetricDollars(metric?: string): number | undefined {
  if (!metric) return undefined;
  const match = metric.match(/\$([\d,]+)/);
  if (match) return parseInt(match[1].replace(/,/g, ""), 10);
  return undefined;
}

function defaultTimeSaved(category: BusinessInsight["category"]): number {
  switch (category) {
    case "sales":
      return 25;
    case "crm":
      return 30;
    case "marketing":
      return 20;
    case "sessions":
      return 15;
    case "operations":
      return 10;
    default:
      return 15;
  }
}

function finalizeInsight(
  insight: Omit<BusinessInsight, "why" | "revenueImpact" | "timeSavedMinutes" | "priority"> &
    Partial<Pick<BusinessInsight, "why" | "revenueImpact" | "timeSavedMinutes">>
): BusinessInsight {
  return {
    ...insight,
    why: insight.why ?? insight.detail,
    revenueImpact: insight.revenueImpact ?? parseMetricDollars(insight.metric),
    timeSavedMinutes: insight.timeSavedMinutes ?? defaultTimeSaved(insight.category),
    priority: insight.severity === "high" ? 1 : insight.severity === "medium" ? 2 : 3,
  };
}

export async function getOperatorMetrics() {
  return withInflight("operator-metrics", async () => {
    const cacheKey = "operator-metrics-v1";
    const cached = await getCached<Awaited<ReturnType<typeof computeOperatorMetrics>>>(cacheKey);
    if (cached) return cached;
    const metrics = await computeOperatorMetrics();
    await setCache(cacheKey, metrics, 60_000).catch(() => {});
    return metrics;
  });
}

async function computeOperatorMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [dashboard, pipeline, analytics30, analytics7, analyticsPrev7, crm, payments] =
    await Promise.all([
      getAdminDashboardOSCached(),
      getAdminPipeline(),
      getAnalyticsSummary(30),
      getAnalyticsSummary(7),
      getAnalyticsSummary(14),
      getAdminCRMContacts(),
      getPaymentRevenueSummary(now),
    ]);

  const [
    bookingsToday,
    leadsToday,
    appsToday,
    contactsToday,
    bookingsThisMonth,
    bookingsLastMonth,
    completedThisMonth,
    pendingGalleries,
    staleBookings,
  ] = await Promise.all([
    prisma.submission.count({ where: { type: "booking", createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { type: "session", createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { type: "contact", createdAt: { gte: todayStart } } }),
    prisma.submission.count({ where: { type: "booking", createdAt: { gte: monthStart } } }),
    prisma.submission.count({
      where: { type: "booking", createdAt: { gte: lastMonthStart, lt: monthStart } },
    }),
    prisma.submission.count({
      where: { type: "booking", status: "completed", updatedAt: { gte: monthStart } },
    }),
    prisma.submission.count({
      where: {
        type: "booking",
        status: { in: ["scheduled", "booked", "planning", "production", "editing"] },
        updatedAt: { lt: new Date(Date.now() - 14 * 86400000) },
      },
    }),
    prisma.submission.count({
      where: {
        type: "booking",
        status: { in: ["new", "contacted", "lead", "qualified", "discovery", "proposal"] },
        updatedAt: { lt: new Date(Date.now() - 3 * 86400000) },
      },
    }),
  ]);

  const pipelineRevenueToday = pipeline.columns
    .flatMap((c) => c.items)
    .filter((i) => new Date(i.createdAt) >= todayStart)
    .reduce((s, i) => s + i.value, 0);

  const pipelineRevenueThisMonth = pipeline.columns
    .flatMap((c) => c.items)
    .filter((i) => new Date(i.createdAt) >= monthStart)
    .reduce((s, i) => s + i.value, 0);

  const pipelineRevenueLastMonth = pipeline.columns
    .flatMap((c) => c.items)
    .filter((i) => {
      const d = new Date(i.createdAt);
      return d >= lastMonthStart && d < monthStart;
    })
    .reduce((s, i) => s + i.value, 0);

  // Prefer settled Stripe payments when any exist; otherwise pipeline estimates.
  const useVerifiedRevenue = payments.hasPayments;
  const revenueToday = useVerifiedRevenue
    ? dollarsFromCents(payments.todayCents)
    : pipelineRevenueToday;
  const revenueThisMonth = useVerifiedRevenue
    ? dollarsFromCents(payments.thisMonthCents)
    : pipelineRevenueThisMonth;
  const revenueLastMonth = useVerifiedRevenue
    ? dollarsFromCents(payments.lastMonthCents)
    : pipelineRevenueLastMonth;

  const inactiveLeads = crm.filter((c) => {
    const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
    return days > 60 && ["completed", "repeat", "vip", "interested"].includes(c.status);
  });

  const inactiveValue = inactiveLeads.reduce((s, c) => s + Math.max(c.revenue, 0), 0);

  const visitorsThisWeek = analytics7.totals.pageviews;
  const visitorsLastWeek = Math.max(
    0,
    analyticsPrev7.totals.pageviews - analytics7.totals.pageviews
  );
  const trafficChange = pctChange(visitorsThisWeek, visitorsLastWeek);

  const conversionChange = pctChange(
    analytics7.totals.conversionRate,
    analytics30.totals.conversionRate
  );

  const instagramReferrals = analytics30.topSources.find((s) =>
    s.source.toLowerCase().includes("instagram")
  );
  const instagramVisits7 = sourceVisits(analytics7.topSources, "instagram");
  const instagramVisits14 = sourceVisits(analyticsPrev7.topSources, "instagram");
  const instagramVisitsPrev7 = Math.max(0, instagramVisits14 - instagramVisits7);

  return {
    generatedAt: now.toISOString(),
    revenue: {
      today: revenueToday,
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      monthChange: pctChange(revenueThisMonth, revenueLastMonth),
      pipeline: pipeline.totalValue,
      verified: useVerifiedRevenue,
      paymentCount: payments.count,
    },
    today: {
      bookings: bookingsToday,
      leads: leadsToday,
      applications: appsToday,
      subscribers: contactsToday,
    },
    month: {
      bookings: bookingsThisMonth,
      bookingsChange: pctChange(bookingsThisMonth, bookingsLastMonth),
      completed: completedThisMonth,
      newLeads: dashboard.metrics.leads.thisMonth,
    },
    attention: {
      tasks: dashboard.metrics.pendingTasks,
      followUpClients: inactiveLeads.length,
      followUpValue: inactiveValue,
      overdueInvoices: 0,
      galleriesAwaiting: pendingGalleries,
      abandonedInquiries: staleBookings,
    },
    traffic: {
      visitors30: analytics30.totals.pageviews,
      visitors7: visitorsThisWeek,
      trafficChange,
      conversionRate: analytics30.totals.conversionRate,
      conversionChange,
      topPage: analytics30.topPages[0]?.path ?? "/",
      instagramReferrals: instagramReferrals?.visits ?? 0,
      instagramChange: weekOverWeekPct(instagramVisits7, instagramVisitsPrev7),
    },
    returningClients: dashboard.metrics.returningClients,
    repeatRate:
      crm.length > 0
        ? Math.round((dashboard.metrics.returningClients / crm.length) * 100)
        : 0,
  };
}

export async function getProactiveBusinessInsights(
  metricsOverride?: Awaited<ReturnType<typeof getOperatorMetrics>>
): Promise<BusinessInsight[]> {
  const [metrics, dashboard, analytics30, analytics7, analytics14] = await Promise.all([
    metricsOverride ? Promise.resolve(metricsOverride) : getOperatorMetrics(),
    getAdminDashboardOSCached(),
    getAnalyticsSummary(30),
    getAnalyticsSummary(7),
    getAnalyticsSummary(14),
  ]);

  const avgBookingValue =
    metrics.month.bookings > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 1500;

  const insights: Array<
    Omit<BusinessInsight, "why" | "revenueImpact" | "timeSavedMinutes" | "priority"> &
      Partial<Pick<BusinessInsight, "why" | "revenueImpact" | "timeSavedMinutes">>
  > = [];
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  if (metrics.month.bookingsChange <= -10) {
    insights.push({
      id: "bookings-down-week",
      category: "sales",
      severity: "high",
      title: `Bookings are down ${Math.abs(metrics.month.bookingsChange)}% this month`,
      detail: `${metrics.month.bookings} booking inquiries vs last month. Promote your top portfolio piece and re-engage warm leads before the month ends.`,
      metric: `${metrics.month.bookingsChange}%`,
      actions: [
        action("recover-bookings", "Create Campaign", "create_campaign", "/admin/marketing?focus=launch_campaign", {
          task: "launch_campaign",
          prompt: "Recovery campaign for slow booking month",
        }),
        action("email-warm", "Draft Re-engagement", "email_clients", OS_ROUTES.marketingFollowUp, {
          task: "follow_up",
        }),
        action("view-analytics", "View Analytics", "navigate", "/admin/analytics"),
      ],
    });
  }

  const portfolioPage = analytics30.topPages.find((p) => p.path.startsWith("/portfolio"));
  if (portfolioPage && portfolioPage.views >= 30) {
    const portfolioViews7 = viewsInPeriod(analytics7.topPages, portfolioPage.path);
    const portfolioViews14 = viewsInPeriod(analytics14.topPages, portfolioPage.path);
    const portfolioViewsPrev7 = Math.max(0, portfolioViews14 - portfolioViews7);
    const portfolioChange = weekOverWeekPct(portfolioViews7, portfolioViewsPrev7);
    const revenueImpact = estimateInquiryRevenue(
      portfolioPage.views,
      metrics.traffic.conversionRate,
      avgBookingValue,
      0.15
    );

    if (portfolioChange >= 15 || portfolioPage.views >= 80) {
      const changeLabel =
        portfolioViewsPrev7 < 5
          ? "is gaining traction"
          : portfolioChange > 0
            ? `up ${portfolioChange}% week-over-week`
            : "shifted";
      insights.push({
        id: "portfolio-traffic",
        category: "marketing",
        severity: portfolioChange >= 30 && revenueImpact >= 500 ? "high" : "medium",
        title: `Portfolio page ${changeLabel}`,
        detail: `"${portfolioPage.path}" drove ${portfolioPage.views} views (30d). Feature this work on homepage, Instagram, and in your next newsletter to convert interest into inquiries.`,
        metric: `~$${revenueImpact.toLocaleString()} addressable`,
        revenueImpact,
        why: `${portfolioViews7} views this week vs ${portfolioViewsPrev7} prior week. Estimated ${Math.round(portfolioPage.views * (metrics.traffic.conversionRate / 100))} inquiries at current conversion.`,
        actions: [
          action("ig-draft", "Publish Instagram Draft", "instagram_draft", "/admin/marketing?focus=instagram_caption", {
            task: "instagram_caption",
            prompt: `Carousel post featuring portfolio page ${portfolioPage.path}`,
          }),
          action("edit-home", "Edit Homepage", "navigate", "/admin/homepage"),
          action("newsletter", "Newsletter Topic", "create_campaign", "/admin/marketing?focus=newsletter", {
            task: "newsletter",
          }),
        ],
      });
    }
  }

  if (metrics.traffic.instagramReferrals > 0 && metrics.traffic.instagramChange >= 25) {
    insights.push({
      id: "instagram-referrals",
      category: "marketing",
      severity: "medium",
      title: "Instagram referrals surged",
      detail: `${metrics.traffic.instagramReferrals} visits from Instagram (30d, +${metrics.traffic.instagramChange}% week-over-week). Double down with Reels and session BTS content while momentum is high.`,
      metric: `~$${estimateInquiryRevenue(metrics.traffic.instagramReferrals, metrics.traffic.conversionRate, avgBookingValue, 0.1).toLocaleString()} est.`,
      revenueImpact: estimateInquiryRevenue(
        metrics.traffic.instagramReferrals,
        metrics.traffic.conversionRate,
        avgBookingValue,
        0.1
      ),
      why: "Week-over-week Instagram referral growth — capitalize before momentum fades.",
      actions: [
        action("reels", "Create Reel Script", "instagram_draft", "/admin/marketing?focus=tiktok_caption", {
          task: "tiktok_caption",
          prompt: "Behind-the-scenes Reel for Instagram momentum",
        }),
        action("session-promo", "Session Promotion", "create_campaign", "/admin/marketing?focus=launch_campaign"),
      ],
    });
  }

  if (metrics.repeatRate >= 20 && metrics.returningClients > 0) {
    insights.push({
      id: "repeat-clients",
      category: "sales",
      severity: "low",
      title: "Repeat clients are growing",
      detail: `${metrics.returningClients} clients booked more than once (${metrics.repeatRate}% repeat rate). Launch a VIP offer or referral bonus to compound loyalty.`,
      metric: `${metrics.repeatRate}% repeat`,
      actions: [
        action("vip-offer", "Create VIP Offer", "create_campaign", "/admin/marketing?focus=campaign", {
          task: "campaign",
          prompt: "VIP offer for repeat portrait clients",
        }),
        action("referrals", "Referral Campaign", "create_campaign", OS_ROUTES.marketingReferral, {
          task: "campaign",
          prompt: "Referral campaign for repeat portrait clients",
        }),
        action("open-crm", "Open CRM", "open_crm", "/admin/crm"),
      ],
    });
  }

  if (metrics.attention.followUpClients > 0) {
    insights.push({
      id: "inactive-leads-value",
      category: "crm",
      severity: "high",
      title: `${metrics.attention.followUpClients} inactive leads worth ~$${metrics.attention.followUpValue.toLocaleString()}`,
      detail: "Past clients and warm leads with no activity in 60+ days. A targeted re-engagement sequence could recover revenue without new ad spend.",
      metric: `$${metrics.attention.followUpValue.toLocaleString()}`,
      actions: [
        action("email-inactive", "Draft Re-engagement", "email_clients", OS_ROUTES.marketingFollowUp, {
          task: "follow_up",
        }),
        action("schedule", "Schedule Follow-Up", "schedule_followup", "/admin/crm"),
        action("workflow", "Create Workflow", "create_workflow", "/admin/automations"),
      ],
    });
  }

  if (metrics.attention.abandonedInquiries > 0) {
    insights.push({
      id: "abandoned-inquiries",
      category: "sales",
      severity: "high",
      title: `${metrics.attention.abandonedInquiries} abandoned booking inquiries`,
      detail: "Open inquiries untouched for 3+ days. Speed-to-lead is the highest ROI action in your pipeline right now.",
      metric: `${metrics.attention.abandonedInquiries} stale`,
      actions: [
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
        action("follow-up", "Schedule Follow-Up", "schedule_followup", "/admin/submissions?type=booking"),
        action("booking-ai", "Booking Assistant", "navigate", "/admin/bookings-ai"),
      ],
    });
  }

  if (metrics.attention.galleriesAwaiting > 0) {
    insights.push({
      id: "galleries-pending",
      category: "operations",
      severity: "medium",
      title: `${metrics.attention.galleriesAwaiting} booked projects idle 14+ days`,
      detail: "Estimated — no gallery entity yet. Confirm editing/delivery status on booked projects.",
      metric: `${metrics.attention.galleriesAwaiting} idle`,
      actions: [
        action("submissions", "View Bookings", "navigate", "/admin/submissions?type=booking"),
        action("email-delivery", "Delivery Follow-Up", "email_clients", OS_ROUTES.marketingGallery, {
          task: "follow_up",
          prompt: "Delivery status follow-up email",
        }),
      ],
    });
  }

  if (dashboard.metrics.applications.pending > 3) {
    insights.push({
      id: "applications-backlog",
      category: "sessions",
      severity: "medium",
      title: `${dashboard.metrics.applications.pending} session applications awaiting review`,
      detail: "Fast responses improve acceptance rates and community perception for ÉLEVÉ Sessions.",
      metric: `${dashboard.metrics.applications.pending} pending`,
      actions: [
        action("review-apps", "Review Applications", "navigate", "/admin/applications?status=pending_review"),
        action("rank-apps", "Rank with AI", "navigate", "/admin/applications"),
      ],
    });
  }

  if (metrics.traffic.conversionChange <= -15 && metrics.traffic.conversionRate > 0) {
    insights.push({
      id: "conversion-drop",
      category: "marketing",
      severity: "high",
      title: `Conversion rate down ${Math.abs(metrics.traffic.conversionChange)}% this week`,
      detail: `Currently ${metrics.traffic.conversionRate}% inquiry conversion. Review booking page friction and homepage CTA placement.`,
      metric: `${metrics.traffic.conversionRate}%`,
      actions: [
        action("website-ai", "Website Optimization", "navigate", "/admin/website"),
        action("book-page", "Review Book Page", "navigate", "/book"),
        action("homepage", "Edit Homepage", "navigate", "/admin/homepage"),
      ],
    });
  }

  insights.push({
    id: "seasonal-" + month.toLowerCase(),
    category: "sales",
    severity: "low",
    title: `${month} performance insight`,
    detail:
      metrics.month.bookingsChange >= 0
        ? `${month} is tracking ${metrics.month.bookingsChange >= 20 ? "strong" : "steady"} with ${metrics.month.bookings} inquiries. Consider a session or portrait promo before month-end.`
        : `${month} is softer than last month. Historical data suggests doubling Instagram portfolio posts and emailing past clients lifts end-of-month bookings.`,
    metric: `${metrics.month.bookings} bookings`,
    actions: [
      action("month-report", "Export Report", "export_report", "/admin/reports?type=monthly"),
      action("marketing", "Marketing Studio", "navigate", "/admin/marketing"),
    ],
  });

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const finalized = insights
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .map(finalizeInsight)
    .map((insight, index) => ({ ...insight, priority: index + 1 }));

  for (const insight of finalized.slice(0, 8)) {
    writeMemory({
      layer: layerForInsightCategory(insight.category),
      category: "executive_insight",
      key: insight.id,
      title: insight.title,
      summary: insight.why,
      value: {
        detail: insight.detail,
        metric: insight.metric,
        revenueImpact: insight.revenueImpact,
        timeSavedMinutes: insight.timeSavedMinutes,
        severity: insight.severity,
        actions: insight.actions.map((a) => ({ label: a.label, href: a.href })),
      },
      confidence: insight.severity === "high" ? 0.92 : insight.severity === "medium" ? 0.78 : 0.65,
      importance: insight.priority <= 2 ? 88 : 65,
      source: "ai",
      sourceRef: "proactive-insights",
    }).catch(() => {});
  }

  return finalized;
}

export async function getMarketingRecommendations(): Promise<MarketingRecommendation[]> {
  const [metrics, analytics, dashboard] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getAdminDashboardOSCached(),
  ]);

  const topPage = analytics.topPages[0]?.path ?? "/portfolio";
  const recs: MarketingRecommendation[] = [];

  if (metrics.attention.followUpClients > 0) {
    recs.push({
      id: "email-reengage",
      channel: "email",
      title: "Re-engagement email to inactive clients",
      reason: `${metrics.attention.followUpClients} clients inactive 60+ days (~$${metrics.attention.followUpValue.toLocaleString()} potential)`,
      priority: "high",
      actions: [
        action("draft-email", "Create Campaign", "email_clients", OS_ROUTES.marketingFollowUp),
        action("gen-email", "Generate Copy", "create_campaign", "/admin/marketing?task=follow_up", {
          task: "follow_up",
        }),
      ],
    });
  }

  recs.push(
    {
      id: "instagram-portfolio",
      channel: "instagram",
      title: "Portfolio carousel from top traffic page",
      reason: `"${topPage}" is your #1 traffic driver (${analytics.topPages[0]?.views ?? 0} views)`,
      priority: "high",
      actions: [
        action("ig-caption", "Instagram Caption", "instagram_draft", "/admin/marketing?focus=instagram_caption", {
          task: "instagram_caption",
        }),
        action("ig-story", "Story Script", "instagram_draft", "/admin/marketing?focus=instagram_story", {
          task: "instagram_story",
        }),
      ],
    },
    {
      id: "seo-portfolio",
      channel: "seo",
      title: "SEO refresh on high-traffic portfolio pages",
      reason: "Capture organic search intent while portfolio views are elevated",
      priority: "medium",
      actions: [
        action("seo-meta", "Generate SEO Meta", "create_campaign", "/admin/marketing?focus=seo_meta", {
          task: "seo_meta",
        }),
        action("blog", "Blog Idea", "create_campaign", "/admin/marketing?focus=blog_post", { task: "blog_post" }),
      ],
    },
    {
      id: "newsletter-monthly",
      channel: "newsletter",
      title: "Monthly newsletter — studio update + booking CTA",
      reason: `${dashboard.metrics.subscribers.value} unique contacts in CRM`,
      priority: "medium",
      actions: [
        action("newsletter", "Newsletter Draft", "create_campaign", "/admin/marketing?focus=newsletter", {
          task: "newsletter",
        }),
      ],
    },
    {
      id: "session-promo",
      channel: "sessions",
      title: "ÉLEVÉ Sessions promotion",
      reason: `${dashboard.metrics.openApplications} volumes accepting applications`,
      priority: dashboard.metrics.openApplications > 0 ? "high" : "low",
      actions: [
        action("session-email", "Session Email", "create_campaign", "/admin/marketing?focus=session_email", {
          task: "session_email",
        }),
        action("reels", "Reel Script", "instagram_draft", "/admin/marketing?focus=tiktok_caption", {
          task: "tiktok_caption",
        }),
      ],
    },
    {
      id: "lead-magnet",
      channel: "lead_magnet",
      title: "Portrait prep guide lead magnet",
      reason: "Convert portfolio browsers who aren't ready to book yet",
      priority: "medium",
      actions: [
        action("landing", "Landing Page Copy", "create_campaign", "/admin/marketing?focus=blog_post", {
          task: "blog_post",
          prompt: "Lead magnet: Portrait Session Prep Guide",
        }),
      ],
    },
    {
      id: "sponsor-pitch",
      channel: "sponsor",
      title: "Sponsor pitch deck narrative",
      reason: `${metrics.traffic.visitors30} site visitors this month · ${metrics.traffic.conversionRate}% conversion`,
      priority: "low",
      actions: [
        action("sponsor", "Create Sponsor PDF", "sponsor_pdf", "/admin/reports?type=sponsor"),
        action("sponsor-page", "Sponsorship Hub", "navigate", "/admin/sponsorship"),
      ],
    }
  );

  return recs;
}

type SalesRecommendationInput = {
  crm: Awaited<ReturnType<typeof getAdminCRMContacts>>;
  pipeline: Awaited<ReturnType<typeof getAdminPipeline>>;
  staleInquiries: number;
  monthBookings: number;
  monthBookingsChange: number;
};

export function buildSalesRecommendations(input: SalesRecommendationInput): SalesRecommendation[] {
  const { crm, pipeline, staleInquiries, monthBookings, monthBookingsChange } = input;
  const stale = staleInquiries;

  const newLeads = pipeline.columns.find((c) => c.id === "lead")?.items ?? [];
  const warmLeads = [
    ...(pipeline.columns.find((c) => c.id === "discovery")?.items ?? []),
    ...(pipeline.columns.find((c) => c.id === "proposal")?.items ?? []),
    ...(pipeline.columns.find((c) => c.id === "qualified")?.items ?? []),
  ];
  const scheduled = [
    ...(pipeline.columns.find((c) => c.id === "booked")?.items ?? []),
    ...(pipeline.columns.find((c) => c.id === "planning")?.items ?? []),
  ];
  const activePipeline = newLeads.length + warmLeads.length;

  const sessionUpsellTargets = crm.filter(
    (c) =>
      c.applications === 0 &&
      (["completed", "booked", "repeat", "vip"].includes(c.status) || c.revenue > 0)
  );
  const vipClients = crm.filter(
    (c) => ["vip", "repeat"].includes(c.status) || (c.revenue > 1500 && c.bookings > 0)
  );

  const recs: SalesRecommendation[] = [];

  if (stale > 0) {
    recs.push({
      id: "recover-abandoned",
      type: "recovery",
      title: "Recover stale booking inquiries",
      detail: `${stale} open ${stale === 1 ? "inquiry" : "inquiries"} idle 3+ days — follow up within 24 hours`,
      impact: "high",
      actions: [
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
        action("submissions", "View Inquiries", "navigate", "/admin/submissions?type=booking"),
      ],
    });
  }

  if (warmLeads.length > 0) {
    recs.push({
      id: "warm-leads",
      type: "follow_up",
      title: "Move contacted leads to booked",
      detail: `${warmLeads.length} in contacted stage — confirm dates and send next steps this week`,
      impact: "high",
      actions: [
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
        action("crm", "Open CRM", "open_crm", "/admin/crm"),
      ],
    });
  } else if (newLeads.length > 0) {
    recs.push({
      id: "new-leads",
      type: "follow_up",
      title: "Respond to new booking inquiries",
      detail: `${newLeads.length} new ${newLeads.length === 1 ? "lead" : "leads"} waiting — speed-to-lead wins conversions`,
      impact: "high",
      actions: [
        action("submissions", "View Inquiries", "navigate", "/admin/submissions?type=booking"),
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
      ],
    });
  }

  if (sessionUpsellTargets.length > 0) {
    recs.push({
      id: "upsell-sessions",
      type: "upsell",
      title: "Upsell ÉLEVÉ Sessions to portrait clients",
      detail: `${sessionUpsellTargets.length} ${sessionUpsellTargets.length === 1 ? "client hasn't" : "clients haven't"} applied to Sessions yet`,
      impact: "high",
      actions: [
        action("crm-sessions", "Open CRM", "open_crm", "/admin/crm"),
        action("email-upsell", "Email Campaign", "email_clients", "/admin/marketing?focus=campaign"),
      ],
    });
  } else if (activePipeline > 0) {
    recs.push({
      id: "upsell-sessions-pipeline",
      type: "upsell",
      title: "Mention ÉLEVÉ Sessions in inquiry replies",
      detail: `${activePipeline} active ${activePipeline === 1 ? "inquiry" : "inquiries"} — plant Sessions interest while momentum is high`,
      impact: "medium",
      actions: [
        action("sessions", "Sessions Hub", "navigate", "/admin/sessions-hub"),
        action("marketing", "Draft Copy", "create_campaign", "/admin/marketing?focus=campaign"),
      ],
    });
  }

  if (scheduled.length > 0) {
    recs.push({
      id: "cross-sell-album",
      type: "cross_sell",
      title: "Album + print package cross-sell",
      detail: `${scheduled.length} booked ${scheduled.length === 1 ? "client" : "clients"} — offer premium collection upgrade before delivery`,
      impact: "medium",
      actions: [
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
        action("packages", "View Services", "navigate", "/admin/services"),
      ],
    });
  }

  if (vipClients.length > 0) {
    recs.push({
      id: "referral-vip",
      type: "referral",
      title: "Referral campaign for VIP clients",
      detail: `${vipClients.length} repeat/VIP ${vipClients.length === 1 ? "client" : "clients"} — highest referral conversion potential`,
      impact: "medium",
      actions: [
        action("referrals", "Referral Campaign", "create_campaign", OS_ROUTES.marketingReferral, {
          task: "campaign",
        }),
        action("vip-email", "VIP Email", "email_clients", "/admin/crm"),
      ],
    });
  }

  if (monthBookingsChange < 0 && monthBookings > 0) {
    recs.push({
      id: "discount-timing",
      type: "discount",
      title: "Limited-time booking incentive (slow month)",
      detail: `${monthBookings} inquiries this month (${monthBookingsChange}% vs last) — a soft mid-week offer can fill gaps`,
      impact: "high",
      actions: [
        action("promo-copy", "Generate Promo Copy", "create_campaign", "/admin/marketing?focus=campaign", {
          task: "campaign",
        }),
      ],
    });
  } else if (monthBookings > 0) {
    recs.push({
      id: "hold-pricing",
      type: "discount",
      title: "Hold pricing — demand is healthy",
      detail: `${monthBookings} ${monthBookings === 1 ? "inquiry" : "inquiries"} this month — prioritize upsells over discounts`,
      impact: "low",
      actions: [
        action("services", "Review Packages", "navigate", "/admin/services"),
        action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
      ],
    });
  }

  const impactOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

  if (recs.length > 0) return recs.slice(0, 6);

  return [
    {
      id: "grow-visibility",
      type: "follow_up",
      title: "Drive booking inquiries",
      detail: "Share fresh portfolio work and availability on Instagram — visibility drives the pipeline",
      impact: "high",
      actions: [
        action("marketing", "Marketing Studio", "create_campaign", "/admin/marketing"),
        action("portfolio", "Update Portfolio", "navigate", "/admin/portfolio"),
      ],
    },
    {
      id: "promote-sessions",
      type: "upsell",
      title: "Promote ÉLEVÉ Sessions",
      detail: "Feature your latest Volume on the homepage and sessions page to build application momentum",
      impact: "medium",
      actions: [
        action("sessions", "Sessions Hub", "navigate", "/admin/sessions-hub"),
        action("homepage", "Edit Homepage", "navigate", "/admin/homepage"),
      ],
    },
  ];
}

export async function getSalesRecommendations(): Promise<SalesRecommendation[]> {
  const [metrics, crm, pipeline] = await Promise.all([
    getOperatorMetrics(),
    getAdminCRMContacts(),
    getAdminPipeline(),
  ]);

  return buildSalesRecommendations({
    crm,
    pipeline,
    staleInquiries: metrics.attention.abandonedInquiries,
    monthBookings: metrics.month.bookings,
    monthBookingsChange: metrics.month.bookingsChange,
  });
}

export async function getSessionsOperatorIntel(): Promise<SessionsOperatorIntel> {
  const [volumes, applications, castCount] = await Promise.all([
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false },
      orderBy: { volumeNumber: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        volumeNumber: true,
        status: true,
        sessionDate: true,
        theme: true,
      },
    }),
    prisma.submission.findMany({
      where: { type: "session" },
      select: { status: true, createdAt: true, data: true, sessionVolumeId: true },
    }),
    prisma.castMember.count(),
  ]);

  const pending = applications.filter(
    (a) => normalizeApplicationStatus(a.status) === "pending_review"
  ).length;

  const appsByVolume = new Map<string, number>();
  for (const a of applications) {
    if (a.sessionVolumeId) {
      appsByVolume.set(a.sessionVolumeId, (appsByVolume.get(a.sessionVolumeId) ?? 0) + 1);
    }
  }

  const openVolume = volumes.find((v) => v.status === "applications_open");

  const themes = [
    "Golden hour editorial",
    "Urban minimalism",
    "Film noir portraits",
    "Desert luxury",
    "Studio high-fashion",
  ];

  const recommendations = [
    {
      id: "review-apps",
      title: "Review pending applications",
      detail: `${pending} applications awaiting decision`,
      actions: [action("apps", "Open Applications", "navigate", "/admin/applications?status=pending_review")],
    },
    openVolume
      ? {
          id: "promote-open-vol",
          title: `Promote Vol. ${openVolume.volumeNumber} applications`,
          detail: `${appsByVolume.get(openVolume.id) ?? 0} applications so far · ${openVolume.theme || "Open theme"}`,
          actions: [
            action("promo", "Session Promotion", "create_campaign", "/admin/marketing?task=session_email", {
              task: "session_email",
              prompt: `Promote Vol. ${openVolume.volumeNumber} applications`,
            }),
            action("rank", "AI Rank Applications", "navigate", "/admin/applications"),
          ],
        }
      : null,
    {
      id: "cast-feature",
      title: "Feature cast members in marketing",
      detail: `${castCount} published cast profiles — use for social proof and sponsor decks`,
      actions: [
        action("cast", "View Cast", "navigate", "/admin/sessions"),
        action("sponsor", "Sponsor PDF", "sponsor_pdf", "/admin/reports?type=sponsor"),
      ],
    },
    {
      id: "attendance-forecast",
      title: "Attendance forecast",
      detail: openVolume
        ? `Based on ${appsByVolume.get(openVolume.id) ?? 0} apps, expect ${Math.max(8, Math.round((appsByVolume.get(openVolume.id) ?? 0) * 0.35))}–${Math.max(12, Math.round((appsByVolume.get(openVolume.id) ?? 0) * 0.5))} accepted participants`
        : "No open volume — plan next session theme and sponsor outreach",
      actions: [action("sessions", "Sessions Hub", "navigate", "/admin/sessions-hub")],
    },
  ].filter(Boolean) as SessionsOperatorIntel["recommendations"];

  return {
    generatedAt: new Date().toISOString(),
    openVolume: openVolume
      ? {
          id: openVolume.id,
          title: openVolume.title,
          volumeNumber: openVolume.volumeNumber,
          applications: appsByVolume.get(openVolume.id) ?? 0,
          theme: openVolume.theme,
        }
      : null,
    totalApplications: applications.length,
    pendingReview: pending,
    castPublished: castCount,
    suggestedThemes: themes.slice(0, 4),
    recommendations,
  };
}

export async function getSelfImprovementRecommendations(): Promise<SelfImprovementItem[]> {
  const [metrics, dashboard] = await Promise.all([getOperatorMetrics(), getAdminDashboardOSCached()]);

  const items: SelfImprovementItem[] = [
    {
      id: "automate-followup",
      area: "automation",
      title: "Automate stale booking follow-ups",
      detail: `${metrics.attention.abandonedInquiries} inquiries go stale without automated reminders. A 24h + 72h workflow saves hours weekly.`,
      impact: "Save 2–4 hrs/week",
      actions: [action("auto", "Create Workflow", "create_workflow", "/admin/automations")],
    },
    {
      id: "crm-segments",
      area: "feature",
      title: "CRM segments for VIP & inactive clients",
      detail: `${metrics.attention.followUpClients} inactive + ${dashboard.metrics.returningClients} repeat clients deserve tagged segments for one-click campaigns.`,
      impact: "Increase repeat bookings",
      actions: [action("crm", "Open CRM", "open_crm", "/admin/crm")],
    },
    {
      id: "conversion-ux",
      area: "ux",
      title: "Booking page conversion optimization",
      detail:
        metrics.traffic.conversionChange < 0
          ? `Conversion dropped ${Math.abs(metrics.traffic.conversionChange)}% — simplify /book form fields and add social proof above fold`
          : "Add testimonial strip and portfolio preview to /book for incremental conversion lift",
      impact: "+5–15% inquiries",
      actions: [action("website", "Website Analysis", "navigate", "/admin/reports?focus=website")],
    },
    {
      id: "insights-inbox",
      area: "ux",
      title: "Unified action queue on dashboard",
      detail: "Consolidate briefing, insights, and notifications into one prioritized task list with one-click handlers.",
      impact: "Faster daily decisions",
      actions: [action("insights", "View Insights", "navigate", "/admin/insights")],
    },
    {
      id: "referral-module",
      area: "feature",
      title: "Launch referral tracking module",
      detail: `${dashboard.metrics.returningClients} repeat clients — referral program is scaffolded but not active`,
      impact: "New lead channel",
      actions: [
        action("referrals", "Referral Campaign", "create_campaign", OS_ROUTES.marketingReferral, {
          task: "campaign",
        }),
      ],
    },
    {
      id: "performance-cache",
      area: "performance",
      title: "Cache briefing & analytics aggregates",
      detail: "Dashboard loads multiple parallel queries — 15-min cache on operator metrics reduces DB load on every admin visit.",
      impact: "Faster dashboard",
      actions: [action("settings", "Settings", "navigate", "/admin/settings")],
    },
  ];

  return items;
}

export async function getCommandCenterHub(keyword: string): Promise<CommandCenterHub | null> {
  const key = keyword.trim().toLowerCase();
  const hubs: Record<string, Omit<CommandCenterHub, "keyword">> = {
    revenue: {
      title: "Revenue Command",
      summary: "Pipeline, bookings, and forecast at a glance",
      href: "/admin/analytics",
      actions: [],
    },
    marketing: {
      title: "Marketing Command",
      summary: "Campaigns, content, and channel opportunities",
      href: "/admin/marketing",
      actions: [],
    },
    sponsors: {
      title: "Sponsorship Command",
      summary: "Audience metrics and sponsor deliverables",
      href: "/admin/sponsorship",
      actions: [],
    },
    clients: {
      title: "CRM Command",
      summary: "Relationships, follow-ups, and client value",
      href: "/admin/crm",
      actions: [],
    },
    bookings: {
      title: "Bookings Command",
      summary: "Pipeline, abandoned inquiries, and sales intelligence",
      href: "/admin/bookings-ai",
      actions: [],
    },
    portfolio: {
      title: "Portfolio Command",
      summary: "Traffic drivers, SEO, and homepage placement",
      href: "/admin/portfolio",
      actions: [],
    },
    sessions: {
      title: "ÉLEVÉ Sessions Command",
      summary: "Applications, cast, themes, and promotions",
      href: "/admin/sessions-hub",
      actions: [],
    },
  };

  const hub = hubs[key];
  if (!hub) return null;

  const [metrics, marketing, sales, sessions] = await Promise.all([
    getOperatorMetrics(),
    key === "marketing" ? getMarketingRecommendations() : Promise.resolve([]),
    key === "revenue" || key === "bookings" ? getSalesRecommendations() : Promise.resolve([]),
    key === "sessions" ? getSessionsOperatorIntel() : Promise.resolve(null),
  ]);

  if (key === "revenue") {
    hub.summary = `~$${metrics.revenue.thisMonth.toLocaleString()} pipeline this month (${metrics.revenue.monthChange >= 0 ? "+" : ""}${metrics.revenue.monthChange}%). $${metrics.revenue.today.toLocaleString()} today.`;
    hub.actions = [
      action("analytics", "View Analytics", "navigate", "/admin/analytics"),
      action("report", "Export Report", "export_report", "/admin/reports?type=revenue"),
      action("pipeline", "Open Pipeline", "navigate", "/admin/pipeline"),
      action("bookings-ai", "Booking Assistant", "navigate", "/admin/bookings-ai"),
    ];
  }

  if (key === "marketing") {
    hub.summary = `${marketing.length} active recommendations · ${metrics.traffic.visitors30} visitors / 30d`;
    hub.actions = marketing.slice(0, 4).flatMap((m) => m.actions.slice(0, 1));
  }

  if (key === "bookings") {
    hub.summary = `${metrics.month.bookings} inquiries this month · ${metrics.attention.abandonedInquiries} need recovery`;
    hub.actions = sales.slice(0, 4).flatMap((s) => s.actions.slice(0, 1));
  }

  if (key === "clients") {
    hub.summary = `${metrics.attention.followUpClients} need follow-up · ~$${metrics.attention.followUpValue.toLocaleString()} potential`;
    hub.actions = [
      action("crm", "Open CRM", "open_crm", "/admin/crm"),
      action("email", "Draft Re-engagement", "email_clients", OS_ROUTES.marketingFollowUp, { task: "follow_up" }),
      action("inactive", "Find Inactive", "navigate", "/admin/crm"),
      action("workflow", "Create Workflow", "create_workflow", "/admin/automations"),
    ];
  }

  if (key === "portfolio") {
    hub.summary = `Top page: ${metrics.traffic.topPage} · ${metrics.traffic.conversionRate}% conversion`;
    hub.actions = [
      action("portfolio", "Edit Portfolio", "navigate", "/admin/portfolio"),
      action("homepage", "Edit Homepage", "navigate", "/admin/homepage"),
      action("ig", "Instagram Draft", "instagram_draft", "/admin/marketing?focus=instagram_caption"),
      action("seo", "SEO Meta", "create_campaign", "/admin/marketing?focus=seo_meta"),
    ];
  }

  if (key === "sessions" && sessions) {
    hub.summary = sessions.openVolume
      ? `Vol. ${sessions.openVolume.volumeNumber} open · ${sessions.openVolume.applications} applications · ${sessions.pendingReview} pending review`
      : `${sessions.totalApplications} total applications · ${sessions.castPublished} cast profiles`;
    hub.actions = sessions.recommendations.flatMap((r) => r.actions.slice(0, 1));
  }

  if (key === "sponsors") {
    hub.summary = `${metrics.traffic.visitors30} monthly visitors · ${metrics.traffic.conversionRate}% conversion · ${metrics.month.bookings} bookings`;
    hub.actions = [
      action("sponsor-report", "Create Sponsor PDF", "sponsor_pdf", "/admin/reports?type=sponsor"),
      action("sponsor-hub", "Sponsorship Hub", "navigate", "/admin/sponsorship"),
      action("analytics", "View Analytics", "navigate", "/admin/analytics"),
    ];
  }

  return { keyword: key, ...hub };
}

/** Map proactive insights to legacy insight shape for backward compatibility */
export async function getLegacyInsightsFromOperator() {
  const insights = await getProactiveBusinessInsights();
  return {
    insights: insights.map((i) => ({
      id: i.id,
      severity: i.severity,
      title: i.title,
      detail: i.detail,
      action: i.actions[0]?.label ?? "View",
      href: i.actions[0]?.href ?? "/admin/insights",
      actions: i.actions,
      category: i.category,
      metric: i.metric,
    })),
    generatedAt: new Date().toISOString(),
  };
}
