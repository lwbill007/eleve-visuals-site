/**
 * Conversion funnel stages + dashboard metrics for ÉLEVÉ OS.
 * Inquiry-first: stages end at Submission completed (not payment).
 */

import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export const FUNNEL_BRANCHES = {
  directBooking: [
    "homepage_loaded",
    "hero_cta_clicked",
    "booking_started",
    "booking_step_1",
    "booking_step_2",
    "booking_step_3",
    "booking_step_4",
    "submission_completed",
  ],
  portfolioDiscovery: ["homepage_loaded", "portfolio_viewed"],
  sessionDiscovery: ["homepage_loaded", "session_viewed"],
} as const;

export type FunnelStage =
  (typeof FUNNEL_BRANCHES)[keyof typeof FUNNEL_BRANCHES][number];

export const LIGHTHOUSE_TARGETS = {
  performance: 95,
  accessibility: 95,
  bestPractices: 100,
  seo: 100,
} as const;

function sinceDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function metaEvent(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  return typeof m.event === "string" ? m.event : null;
}

function metaLabel(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  return typeof m.label === "string" ? m.label : null;
}

function metaStep(metadata: Prisma.JsonValue | null): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  return typeof m.step === "number" ? m.step : null;
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export interface FunnelStepMetric {
  id: FunnelStage | string;
  label: string;
  count: number;
  dropOffPct: number | null;
  conversionFromStartPct: number;
}

export interface ConversionDashboard {
  periodDays: number;
  visitors: number;
  pageviews: number;
  heroClicks: number;
  heroCtr: number;
  bookingStarts: number;
  bookingStartRate: number;
  bookingCompletions: number;
  inquiryCompletionRate: number;
  portfolioViews: number;
  inquiriesPerPortfolioViewPct: number;
  sessionViews: number;
  inquiriesPerSessionViewPct: number;
  avgCompletionMinutes: number | null;
  mobileSharePct: number | null;
  desktopSharePct: number | null;
  topTrafficSource: { source: string; visits: number } | null;
  mostViewedSession: { path: string; views: number } | null;
  mostClickedPortfolio: { path: string; views: number } | null;
  funnel: FunnelStepMetric[];
  funnels: {
    directBooking: FunnelStepMetric[];
    portfolioDiscovery: FunnelStepMetric[];
    sessionDiscovery: FunnelStepMetric[];
  };
  lighthouseTargets: typeof LIGHTHOUSE_TARGETS;
  note: string;
}

function buildFunnel(
  steps: { id: string; label: string; count: number }[]
): FunnelStepMetric[] {
  const start = steps[0]?.count || 1;
  return steps.map((step, index) => {
    const previous = index === 0 ? null : steps[index - 1].count;
    const dropOff =
      previous != null && previous > 0
        ? Math.round(((previous - step.count) / previous) * 1000) / 10
        : null;
    return {
      ...step,
      dropOffPct: dropOff != null && dropOff >= 0 ? dropOff : null,
      conversionFromStartPct: rate(step.count, start),
    };
  });
}

export async function getConversionDashboard(days = 30): Promise<ConversionDashboard> {
  const since = sinceDays(days);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      type: true,
      path: true,
      referrer: true,
      utmSource: true,
      conversionType: true,
      sessionId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const pageviews = events.filter((e) => e.type === "pageview");
  const engagements = events.filter((e) => e.type === "engagement");
  const conversions = events.filter((e) => e.type === "conversion");

  const visitors = new Set(pageviews.map((p) => p.sessionId).filter(Boolean)).size;

  const homepageLoads =
    engagements.filter(
      (e) => metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === "homepage_loaded"
    ).length || pageviews.filter((p) => p.path === "/").length;

  const heroClicks = engagements.filter(
    (e) =>
      (metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === "hero_cta_clicked") ||
      (metaEvent(e.metadata) === "cta_click" &&
        (metaLabel(e.metadata) === "hero_primary" || metaLabel(e.metadata) === "hero_secondary"))
  ).length;

  const portfolioViews =
    engagements.filter(
      (e) => metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === "portfolio_viewed"
    ).length || pageviews.filter((p) => p.path === "/portfolio" || p.path.startsWith("/portfolio/")).length;

  const sessionViews =
    engagements.filter(
      (e) => metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === "session_viewed"
    ).length || pageviews.filter((p) => p.path === "/sessions" || p.path.startsWith("/sessions/")).length;

  const bookingStarts =
    engagements.filter(
      (e) => metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === "booking_started"
    ).length || pageviews.filter((p) => p.path === "/book").length;

  const stepCounts = [1, 2, 3, 4].map((step) => {
    const funnelLabel = `booking_step_${step}`;
    const fromFunnel = engagements.filter(
      (e) => metaEvent(e.metadata) === "funnel" && metaLabel(e.metadata) === funnelLabel
    ).length;
    const fromFormStep = engagements.filter(
      (e) => metaEvent(e.metadata) === "form_step" && metaStep(e.metadata) === step && e.path === "/book"
    ).length;
    return Math.max(fromFunnel, fromFormStep);
  });

  const bookingCompletions = conversions.filter((c) => c.conversionType === "booking").length;

  // Average completion time: sessions that hit booking_started and submission
  const bySession = new Map<string, { start?: Date; end?: Date }>();
  for (const e of events) {
    if (!e.sessionId) continue;
    const label = metaLabel(e.metadata);
    const event = metaEvent(e.metadata);
    if (event === "funnel" && label === "booking_started") {
      const row = bySession.get(e.sessionId) ?? {};
      row.start = e.createdAt;
      bySession.set(e.sessionId, row);
    }
    if (e.type === "conversion" && e.conversionType === "booking") {
      const row = bySession.get(e.sessionId) ?? {};
      row.end = e.createdAt;
      bySession.set(e.sessionId, row);
    }
    if (event === "funnel" && label === "submission_completed") {
      const row = bySession.get(e.sessionId) ?? {};
      row.end = e.createdAt;
      bySession.set(e.sessionId, row);
    }
  }
  const durations: number[] = [];
  for (const row of bySession.values()) {
    if (row.start && row.end && row.end > row.start) {
      durations.push((row.end.getTime() - row.start.getTime()) / 60000);
    }
  }
  const avgCompletionMinutes =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null;

  // Device: from metadata.device when present
  let mobile = 0;
  let desktop = 0;
  for (const e of engagements) {
    if (!e.metadata || typeof e.metadata !== "object" || Array.isArray(e.metadata)) continue;
    const device = (e.metadata as Record<string, unknown>).device;
    if (device === "mobile") mobile += 1;
    if (device === "desktop") desktop += 1;
  }
  const deviceTotal = mobile + desktop;

  const sourceCounts = new Map<string, number>();
  for (const pv of pageviews) {
    const source =
      pv.utmSource ||
      (() => {
        if (!pv.referrer) return "Direct";
        try {
          const host = new URL(pv.referrer).hostname.replace(/^www\./, "");
          if (host.includes("google")) return "Google";
          if (host.includes("instagram")) return "Instagram";
          return host;
        } catch {
          return "Other";
        }
      })();
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const sessionPathCounts = new Map<string, number>();
  const portfolioPathCounts = new Map<string, number>();
  for (const pv of pageviews) {
    if (pv.path.startsWith("/sessions/") && !pv.path.includes("/apply") && !pv.path.includes("/cast/")) {
      sessionPathCounts.set(pv.path, (sessionPathCounts.get(pv.path) ?? 0) + 1);
    }
    if (pv.path.startsWith("/portfolio/")) {
      portfolioPathCounts.set(pv.path, (portfolioPathCounts.get(pv.path) ?? 0) + 1);
    }
  }
  const topSession = [...sessionPathCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPortfolio = [...portfolioPathCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const bookingSteps: { id: string; label: string; count: number }[] = [
    { id: "homepage_loaded", label: "Homepage loaded", count: homepageLoads },
    { id: "hero_cta_clicked", label: "Hero CTA clicked", count: heroClicks },
    { id: "booking_started", label: "Booking started", count: bookingStarts },
    { id: "booking_step_1", label: "Step 1 completed", count: stepCounts[0] },
    { id: "booking_step_2", label: "Step 2 completed", count: stepCounts[1] },
    { id: "booking_step_3", label: "Step 3 completed", count: stepCounts[2] },
    { id: "booking_step_4", label: "Step 4 completed", count: stepCounts[3] },
    { id: "submission_completed", label: "Submission completed", count: bookingCompletions },
  ];
  const funnel = buildFunnel(bookingSteps);
  const portfolioDiscovery = buildFunnel([
    { id: "homepage_loaded", label: "Homepage loaded", count: homepageLoads },
    { id: "portfolio_viewed", label: "Portfolio viewed", count: portfolioViews },
  ]);
  const sessionDiscovery = buildFunnel([
    { id: "homepage_loaded", label: "Homepage loaded", count: homepageLoads },
    { id: "session_viewed", label: "Session viewed", count: sessionViews },
  ]);

  return {
    periodDays: days,
    visitors: visitors || homepageLoads,
    pageviews: pageviews.length,
    heroClicks,
    heroCtr: rate(heroClicks, homepageLoads || visitors || 1),
    bookingStarts,
    bookingStartRate: rate(bookingStarts, visitors || homepageLoads || 1),
    bookingCompletions,
    inquiryCompletionRate: rate(bookingCompletions, bookingStarts || 1),
    portfolioViews,
    inquiriesPerPortfolioViewPct: rate(bookingCompletions, portfolioViews || 1),
    sessionViews,
    inquiriesPerSessionViewPct: rate(bookingCompletions, sessionViews || 1),
    avgCompletionMinutes,
    mobileSharePct: deviceTotal ? rate(mobile, deviceTotal) : null,
    desktopSharePct: deviceTotal ? rate(desktop, deviceTotal) : null,
    topTrafficSource: topSource ? { source: topSource[0], visits: topSource[1] } : null,
    mostViewedSession: topSession ? { path: topSession[0], views: topSession[1] } : null,
    mostClickedPortfolio: topPortfolio ? { path: topPortfolio[0], views: topPortfolio[1] } : null,
    funnel,
    funnels: {
      directBooking: funnel,
      portfolioDiscovery,
      sessionDiscovery,
    },
    lighthouseTargets: LIGHTHOUSE_TARGETS,
    note:
      "Discovery paths are separate branches. Inquiry-per-view figures are ratios, not user-level attribution.",
  };
}
