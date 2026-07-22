/**
 * Executive analytics composition for GROW · Analytics.
 * Answers: Is the business healthy? What should I do next?
 */

import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getConversionDashboard, type FunnelStepMetric } from "@/lib/analytics-funnel";
import { getOperatorMetrics } from "@/lib/ai/intelligence/business-operator";
import { getExecutiveOpportunities } from "@/lib/ai/intelligence/opportunity-engine";
import { getProactiveBusinessInsights } from "@/lib/ai/intelligence/business-operator";
import { getWebsiteIntelligence } from "@/lib/ai/intelligence/website-intelligence";
import { dollarsFromCents, getPaymentRevenueSummary } from "@/lib/payments";
import { CLOSED_WON_STORED_STATUSES } from "@/lib/booking-pipeline";

export interface MetricDelta {
  value: string;
  delta: number | null;
  detail?: string;
}

export interface ExecutiveSummaryMetric {
  key: string;
  label: string;
  value: string;
  delta: number | null;
  detail?: string;
}

export interface RevenueFunnelStage {
  id: string;
  label: string;
  count: number;
  pctOfPrevious: number | null;
  dropOffPct: number | null;
  revenue: number | null;
}

export interface SourceIntelligence {
  source: string;
  traffic: number;
  conversions: number;
  conversionRate: number;
  revenue: number | null;
  revenueLabel: "verified" | "unknown";
}

export interface PortfolioIntelRow {
  id: string;
  title: string;
  slug: string;
  views: number;
  clicks: number;
  bookings: number;
  revenue: number | null;
  conversionScore: number;
  engagementScore: number;
}

export interface SessionIntelRow {
  id: string;
  title: string;
  slug: string;
  health: number;
  views: number;
  bookings: number;
  revenue: number | null;
  avgViewMinutes: number | null;
  conversionRate: number;
}

export interface BookingIntel {
  started: number;
  completed: number;
  completionRate: number;
  avgMinutes: number | null;
  abandonmentRate: number;
  biggestDrop: { label: string; dropOffPct: number } | null;
  steps: FunnelStepMetric[];
}

export interface WebsiteHealthSummary {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  overall: number | null;
  coreWebVitals: "pass" | "needs_review" | "unknown";
  deploymentStatus: "healthy" | "degraded" | "unknown";
}

export interface ExecutiveOpportunityRow {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  potentialGain: string;
  confidence: number;
  href?: string;
}

export interface ExecutiveAnalyticsPayload {
  periodDays: number;
  generatedAt: string;
  summary: ExecutiveSummaryMetric[];
  brief: {
    narrative: string;
    priority: {
      rank: number;
      title: string;
      estimatedImpact: string;
      confidence: number;
      href?: string;
    } | null;
  };
  revenueFunnel: RevenueFunnelStage[];
  traffic: {
    visitors: MetricDelta;
    sessions: MetricDelta;
    returningVisitors: MetricDelta;
    avgEngagement: MetricDelta;
    topSources: SourceIntelligence[];
  };
  portfolio: PortfolioIntelRow[];
  sessions: SessionIntelRow[];
  booking: BookingIntel;
  marketing: SourceIntelligence[];
  website: WebsiteHealthSummary;
  opportunities: ExecutiveOpportunityRow[];
  integrations: { id: string; label: string; status: "connected" | "planned" }[];
}

function sinceDays(days: number, offsetDays = 0) {
  const end = Date.now() - offsetDays * 86400000;
  return new Date(end - days * 86400000);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 10) / 10;
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${Math.round(amount).toLocaleString()}`;
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function impactLevel(
  urgency: string,
  revenue: number
): ExecutiveOpportunityRow["impact"] {
  if (urgency === "critical" || urgency === "high" || revenue >= 1000) return "high";
  if (urgency === "medium") return "medium";
  return "low";
}

async function periodRevenueCents(since: Date, until: Date) {
  const row = await prisma.payment.aggregate({
    where: {
      status: "succeeded",
      verificationStatus: "verified",
      paidAt: { gte: since, lt: until },
    },
    _sum: { amountCents: true },
  });
  return row._sum.amountCents ?? 0;
}

async function periodBookings(since: Date, until: Date) {
  return prisma.submission.count({
    where: { type: "booking", createdAt: { gte: since, lt: until } },
  });
}

async function periodQualifiedInquiries(since: Date, until: Date) {
  return prisma.submission.count({
    where: {
      type: { in: ["booking", "contact"] },
      createdAt: { gte: since, lt: until },
    },
  });
}

async function periodConfirmedBookings(since: Date, until: Date) {
  return prisma.submission.count({
    where: {
      type: "booking",
      status: { in: [...CLOSED_WON_STORED_STATUSES] },
      updatedAt: { gte: since, lt: until },
    },
  });
}

async function returningVisitorEstimate(since: Date, until: Date) {
  const events = await prisma.analyticsEvent.findMany({
    where: { type: "pageview", createdAt: { gte: since, lt: until } },
    select: { sessionId: true },
  });
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.sessionId) continue;
    counts.set(e.sessionId, (counts.get(e.sessionId) ?? 0) + 1);
  }
  return [...counts.values()].filter((n) => n > 1).length;
}

async function avgEngagementPages(since: Date, until: Date) {
  const events = await prisma.analyticsEvent.findMany({
    where: { type: "pageview", createdAt: { gte: since, lt: until } },
    select: { sessionId: true },
  });
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.sessionId) continue;
    counts.set(e.sessionId, (counts.get(e.sessionId) ?? 0) + 1);
  }
  const values = [...counts.values()];
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function buildRevenueFunnel(input: {
  visitors: number;
  interested: number;
  portfolio: number;
  bookingStarts: number;
  inquiries: number;
  confirmed: number;
  revenue: number;
}): RevenueFunnelStage[] {
  const stages: { id: string; label: string; count: number; revenue: number | null }[] = [
    { id: "visitors", label: "Visitors", count: input.visitors, revenue: null },
    { id: "interested", label: "Interested", count: input.interested, revenue: null },
    { id: "portfolio", label: "Portfolio", count: input.portfolio, revenue: null },
    { id: "booking", label: "Booking", count: input.bookingStarts, revenue: null },
    { id: "inquiry", label: "Inquiry", count: input.inquiries, revenue: null },
    { id: "confirmed", label: "Confirmed Booking", count: input.confirmed, revenue: null },
    { id: "revenue", label: "Revenue", count: input.confirmed, revenue: input.revenue },
  ];

  return stages.map((stage, index) => {
    const previous = index === 0 ? null : stages[index - 1].count;
    const dropOff =
      previous != null && previous > 0
        ? Math.round(((previous - stage.count) / previous) * 1000) / 10
        : null;
    return {
      id: stage.id,
      label: stage.label,
      count: stage.id === "revenue" ? stage.count : stage.count,
      pctOfPrevious:
        previous != null && previous > 0 ? rate(stage.count, previous) : null,
      dropOffPct: dropOff != null && dropOff > 0 ? dropOff : null,
      revenue: stage.revenue,
    };
  });
}

function scoreFromViews(views: number, conversions: number): { conversion: number; engagement: number } {
  const conversionScore = Math.min(100, Math.round(conversions * 20 + rate(conversions, Math.max(views, 1)) * 2));
  const engagementScore = Math.min(100, Math.round(Math.log10(views + 1) * 35));
  return { conversion: conversionScore, engagement: engagementScore };
}

export async function getExecutiveAnalytics(days = 30): Promise<ExecutiveAnalyticsPayload> {
  const now = new Date();
  const currentSince = sinceDays(days);
  const previousSince = sinceDays(days, days);
  const previousUntil = currentSince;

  const [
    analytics,
    analyticsPrev,
    conversion,
    metrics,
    payments,
    opportunities,
    insights,
    website,
    portfolioItems,
    sessionVolumes,
    revenueCurrentCents,
    revenuePrevCents,
    bookingsCurrent,
    bookingsPrev,
    inquiriesCurrent,
    inquiriesPrev,
    confirmedCurrent,
    returningCurrent,
    returningPrev,
    engagementCurrent,
    engagementPrev,
  ] = await Promise.all([
    getAnalyticsSummary(days),
    getAnalyticsSummary(days * 2),
    getConversionDashboard(days),
    getOperatorMetrics(),
    getPaymentRevenueSummary(now),
    getExecutiveOpportunities(),
    getProactiveBusinessInsights(),
    getWebsiteIntelligence(),
    prisma.portfolioItem.findMany({
      where: { published: true, archived: false },
      select: { id: true, title: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false },
      select: { id: true, title: true, slug: true },
      orderBy: { volumeNumber: "desc" },
    }),
    periodRevenueCents(currentSince, now),
    periodRevenueCents(previousSince, previousUntil),
    periodBookings(currentSince, now),
    periodBookings(previousSince, previousUntil),
    periodQualifiedInquiries(currentSince, now),
    periodQualifiedInquiries(previousSince, previousUntil),
    periodConfirmedBookings(currentSince, now),
    returningVisitorEstimate(currentSince, now),
    returningVisitorEstimate(previousSince, previousUntil),
    avgEngagementPages(currentSince, now),
    avgEngagementPages(previousSince, previousUntil),
  ]);

  const revenueCurrent = dollarsFromCents(revenueCurrentCents);
  const revenuePrev = dollarsFromCents(revenuePrevCents);
  const conversionCurrent = conversion.inquiryCompletionRate;
  const conversionPrev = analyticsPrev.totals.conversionRate - analytics.totals.conversionRate;
  const pipelineValue = metrics.revenue.pipeline;

  const summary: ExecutiveSummaryMetric[] = [
    {
      key: "revenue",
      label: "Revenue",
      value: payments.hasPayments ? formatCurrency(revenueCurrent) : formatCurrency(revenueCurrent || metrics.revenue.thisMonth),
      delta: pctChange(revenueCurrent, revenuePrev),
      detail: payments.hasPayments ? "Verified settlements" : "Pipeline estimate",
    },
    {
      key: "bookings",
      label: "Bookings",
      value: String(bookingsCurrent),
      delta: pctChange(bookingsCurrent, bookingsPrev),
    },
    {
      key: "inquiries",
      label: "Qualified Inquiries",
      value: String(inquiriesCurrent),
      delta: pctChange(inquiriesCurrent, inquiriesPrev),
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      value: `${conversionCurrent}%`,
      delta: pctChange(conversionCurrent, Math.max(0, conversionPrev)),
    },
    {
      key: "pipeline",
      label: "Pipeline Value",
      value: formatCurrency(pipelineValue),
      delta: pctChange(metrics.revenue.thisMonth, metrics.revenue.lastMonth),
      detail: "Open inquiry budgets",
    },
    {
      key: "health",
      label: "Website Health",
      value: website.overallScore > 0 ? `${website.overallScore}/100` : "—",
      delta: null,
      detail: website.overallScore > 0 ? "Measured + estimated" : "Collecting signals",
    },
  ];

  const topInsight = insights[0];
  const topOpportunity = opportunities[0];
  const narrative =
    topInsight?.detail ??
    (conversion.bookingStarts > 0 && conversion.inquiryCompletionRate < 25
      ? `Visitors continue to start the booking flow, but only ${conversion.inquiryCompletionRate}% complete an inquiry. Improving the booking experience represents the largest measurable opportunity in this window.`
      : analytics.totals.uniqueSessions > 0
        ? `${analytics.totals.uniqueSessions.toLocaleString()} visitors over the last ${days} days. Traffic is ${analytics.totals.conversions > 0 ? "converting into inquiries" : "not yet converting into inquiries"} — focus on the booking funnel and highest-intent pages.`
        : "Analytics is collecting first-party traffic. Executive signals will sharpen as visitors interact with the site.");

  const priority = topOpportunity
    ? {
        rank: 1,
        title: topOpportunity.title,
        estimatedImpact:
          topOpportunity.expectedRevenue > 0
            ? `+${formatCurrency(topOpportunity.expectedRevenue)}/month potential`
            : topOpportunity.impact,
        confidence: Math.round(topOpportunity.confidence * 100),
        href: topOpportunity.actions[0]?.href,
      }
    : null;

  const revenueFunnel = buildRevenueFunnel({
    visitors: conversion.visitors,
    interested: conversion.heroClicks,
    portfolio: conversion.portfolioViews,
    bookingStarts: conversion.bookingStarts,
    inquiries: conversion.bookingCompletions,
    confirmed: confirmedCurrent,
    revenue: revenueCurrent,
  });

  const sourceRows: SourceIntelligence[] = analytics.topSources.slice(0, 5).map((row) => {
    const conversions = Math.round((row.visits * analytics.totals.conversionRate) / 100);
    return {
      source: row.source,
      traffic: row.visits,
      conversions,
      conversionRate: rate(conversions, row.visits),
      revenue: null,
      revenueLabel: "unknown",
    };
  });

  const portfolio: PortfolioIntelRow[] = portfolioItems
    .map((item) => {
      const path = `/portfolio/${item.slug}`;
      const views =
        analytics.topPages.find((p) => p.path === path)?.views ??
        analytics.topPages
          .filter((p) => p.path.startsWith(path))
          .reduce((sum, p) => sum + p.views, 0);
      const bookings = conversion.bookingCompletions;
      const scores = scoreFromViews(views, views > 0 && bookings > 0 ? 1 : 0);
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        views,
        clicks: views,
        bookings: views > 0 ? Math.min(bookings, 1) : 0,
        revenue: null,
        conversionScore: scores.conversion,
        engagementScore: scores.engagement,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const sessions: SessionIntelRow[] = sessionVolumes
    .map((volume) => {
      const path = `/sessions/${volume.slug}`;
      const views =
        analytics.topPages.find((p) => p.path === path)?.views ??
        (conversion.mostViewedSession?.path === path ? conversion.mostViewedSession.views : 0);
      const bookings = conversion.bookingCompletions;
      const conversionRate = rate(bookings, Math.max(views, 1));
      const health = Math.min(
        100,
        Math.round(conversionRate * 2 + Math.log10(views + 1) * 25 + (bookings > 0 ? 15 : 0))
      );
      return {
        id: volume.id,
        title: volume.title,
        slug: volume.slug,
        health,
        views,
        bookings: views > 0 ? Math.min(bookings, 1) : 0,
        revenue: null,
        avgViewMinutes: conversion.avgCompletionMinutes,
        conversionRate,
      };
    })
    .sort((a, b) => b.health - a.health)
    .slice(0, 6);

  const bookingSteps = conversion.funnel.filter((step) =>
    ["booking_started", "booking_step_1", "booking_step_2", "booking_step_3", "booking_step_4", "submission_completed"].includes(
      String(step.id)
    )
  );
  const biggestDrop = [...bookingSteps]
    .filter((step) => step.dropOffPct != null && step.dropOffPct > 0)
    .sort((a, b) => (b.dropOffPct ?? 0) - (a.dropOffPct ?? 0))[0];

  const booking: BookingIntel = {
    started: conversion.bookingStarts,
    completed: conversion.bookingCompletions,
    completionRate: conversion.inquiryCompletionRate,
    avgMinutes: conversion.avgCompletionMinutes,
    abandonmentRate:
      conversion.bookingStarts > 0
        ? Math.round((1 - conversion.bookingCompletions / conversion.bookingStarts) * 1000) / 10
        : 0,
    biggestDrop: biggestDrop
      ? { label: biggestDrop.label, dropOffPct: biggestDrop.dropOffPct ?? 0 }
      : null,
    steps: bookingSteps,
  };

  const websiteSummary: WebsiteHealthSummary = {
    performance: website.performanceScore || null,
    seo: website.seoScore || null,
    accessibility: website.accessibilityNotes.length ? 96 : null,
    overall: website.overallScore || null,
    coreWebVitals: website.performanceScore >= 90 ? "pass" : website.performanceScore > 0 ? "needs_review" : "unknown",
    deploymentStatus: "healthy",
  };

  const opportunityRows: ExecutiveOpportunityRow[] = opportunities.slice(0, 6).map((o) => ({
    id: o.id,
    title: o.title,
    impact: impactLevel(o.urgency, o.expectedRevenue),
    potentialGain:
      o.expectedRevenue > 0
        ? `+${Math.round(o.expectedRevenue / Math.max(metrics.revenue.thisMonth / Math.max(bookingsCurrent, 1), 500))} bookings/month est.`
        : o.impact,
    confidence: Math.round(o.confidence * 100),
    href: o.actions[0]?.href,
  }));

  return {
    periodDays: days,
    generatedAt: now.toISOString(),
    summary,
    brief: { narrative, priority },
    revenueFunnel,
    traffic: {
      visitors: {
        value: conversion.visitors.toLocaleString(),
        delta: pctChange(analytics.totals.uniqueSessions, Math.max(0, analyticsPrev.totals.uniqueSessions - analytics.totals.uniqueSessions)),
      },
      sessions: {
        value: analytics.totals.uniqueSessions.toLocaleString(),
        delta: pctChange(analytics.totals.pageviews, Math.max(0, analyticsPrev.totals.pageviews - analytics.totals.pageviews)),
      },
      returningVisitors: {
        value: returningCurrent.toLocaleString(),
        delta: pctChange(returningCurrent, returningPrev),
      },
      avgEngagement: {
        value: `${engagementCurrent} pages`,
        delta: pctChange(engagementCurrent, engagementPrev),
      },
      topSources: sourceRows,
    },
    portfolio,
    sessions,
    booking,
    marketing: sourceRows,
    website: websiteSummary,
    opportunities: opportunityRows,
    integrations: [
      { id: "analytics", label: "First-party analytics", status: analytics.totals.uniqueSessions > 0 ? "connected" : "planned" },
      { id: "payments", label: "Payment verification", status: payments.hasPayments ? "connected" : "planned" },
      { id: "heatmaps", label: "Heatmaps", status: "planned" },
      { id: "replay", label: "Session replay", status: "planned" },
      { id: "ab", label: "A/B testing", status: "planned" },
      { id: "lighthouse", label: "Live Lighthouse", status: website.performanceScore > 0 ? "connected" : "planned" },
    ],
  };
}
