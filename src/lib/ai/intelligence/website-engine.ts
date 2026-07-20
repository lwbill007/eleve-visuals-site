/**
 * ÉLEVÉ OS Website Intelligence Engine — canonical aggregator.
 * Never fabricates rankings, Lighthouse, or conversion guarantees.
 * Distinguishes Measured Data vs AI Analysis vs Industry Best Practice vs Estimated Opportunity.
 */

import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import { getMemory } from "../memory/store";
import { getOperatorMetrics } from "./business-operator";
import { getWebsiteHeatIntelligence } from "./website-heat";
import {
  buildEvidenceBundle,
  scoreConfidenceFromEvidence,
  type EvidenceItem,
} from "../evidence/schema";
import type {
  WebsiteCategoryScore,
  WebsiteDataSource,
  WebsiteIntelligenceEngine,
  WebsiteRecommendation,
} from "./website-engine-types";

export type {
  WebsiteCategoryId,
  WebsiteCategoryScore,
  WebsiteDataSource,
  WebsiteIntelligenceEngine,
  WebsiteRecommendation,
  WebsiteRecSort,
  WebsiteTruthKind,
} from "./website-engine-types";
export { sortWebsiteRecommendations } from "./website-engine-types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roiScore(r: Pick<WebsiteRecommendation, "businessImpact" | "uxImpact" | "seoImpact" | "estimatedMinutes" | "confidence">) {
  const impact = r.businessImpact * 0.45 + r.uxImpact * 0.25 + r.seoImpact * 0.3;
  const effortPenalty = Math.min(40, r.estimatedMinutes / 3);
  return Math.round(impact * (r.confidence / 100) - effortPenalty);
}

export async function buildWebsiteIntelligenceEngine(): Promise<WebsiteIntelligenceEngine> {
  const [metrics, analytics, heat, reportMem, portfolioCount, homepage, siteSettings] =
    await Promise.all([
      getOperatorMetrics(),
      getAnalyticsSummary(30),
      getWebsiteHeatIntelligence(30),
      getMemory("marketing", "executive_report", "website-health").catch(() => null),
      prisma.portfolioItem.count({ where: { published: true, archived: false } }),
      prisma.siteContent.findUnique({ where: { key: "homepage" } }),
      prisma.siteContent.findUnique({ where: { key: "settings" } }).catch(() => null),
    ]);

  const report = (reportMem?.value ?? {}) as {
    overallHealthScore?: number;
    seoScore?: number;
    uxScore?: number;
    recommendations?: string[] | { title?: string; detail?: string; category?: string; confidence?: number }[];
    seoOpportunities?: string[];
    accessibilityIssues?: string[];
    performanceConcerns?: string[];
    conversionBlockers?: string[];
    missingCTAs?: string[];
  };

  const hasAnalytics = analytics.totals.pageviews > 0;
  const hasScan = Boolean(reportMem);
  const hasPortfolio = portfolioCount > 0;
  const hasHomepage = Boolean(homepage);
  const conversionRate = metrics.traffic.conversionRate;
  const bookingConversions = analytics.conversions.booking ?? 0;

  const dataSources: WebsiteDataSource[] = [
    {
      id: "analytics",
      label: "Website Analytics",
      present: hasAnalytics,
      detail: hasAnalytics
        ? `${analytics.totals.pageviews} pageviews · ${analytics.totals.uniqueSessions} sessions (30d)`
        : "No first-party analytics events collected yet",
    },
    {
      id: "crm",
      label: "CRM / Pipeline Data",
      present: metrics.attention.abandonedInquiries >= 0,
      detail: `${metrics.attention.abandonedInquiries} stale inquiries · ${metrics.month.bookings} bookings this month`,
    },
    {
      id: "portfolio",
      label: "Portfolio Analytics",
      present: hasPortfolio,
      detail: hasPortfolio
        ? `${portfolioCount} published projects`
        : "No published portfolio items",
    },
    {
      id: "booking",
      label: "Booking Analytics",
      present: bookingConversions > 0 || metrics.month.bookings > 0,
      detail: `${bookingConversions} booking conversions (30d analytics)`,
    },
    {
      id: "seo_scan",
      label: "SEO Audit (Platform Scan)",
      present: hasScan,
      detail: hasScan
        ? `Last scan health ${report.overallHealthScore ?? "—"}`
        : "Run Intelligence Refresh in Memory to collect CMS SEO scan",
    },
    {
      id: "lighthouse",
      label: "Performance Audit (Lighthouse)",
      present: false,
      detail: "Not connected — Performance scores will not be fabricated",
    },
    {
      id: "a11y_scan",
      label: "Accessibility Scan",
      present: Boolean(report.accessibilityIssues?.length),
      detail: report.accessibilityIssues?.length
        ? `${report.accessibilityIssues.length} issues from platform scan`
        : "No automated a11y scan connected",
    },
    {
      id: "live_web",
      label: "Verified Live Research",
      present: false,
      detail: "Web research connector not wired",
    },
  ];

  const evidenceItems: EvidenceItem[] = [
    {
      id: "e-pv",
      label: "Pageviews (30d)",
      value: String(analytics.totals.pageviews),
      sourceType: "internal_analytics",
      status: hasAnalytics ? "verified" : "missing",
    },
    {
      id: "e-cr",
      label: "Conversion rate",
      value: `${conversionRate}%`,
      sourceType: "internal_analytics",
      status: hasAnalytics ? "verified" : "missing",
    },
    {
      id: "e-book",
      label: "Booking conversions",
      value: String(bookingConversions),
      sourceType: "internal_booking",
      status: bookingConversions > 0 ? "verified" : "estimated",
    },
    {
      id: "e-port",
      label: "Published portfolio",
      value: String(portfolioCount),
      sourceType: "internal_portfolio",
      status: hasPortfolio ? "verified" : "missing",
    },
    {
      id: "e-scan",
      label: "Platform SEO scan",
      value: hasScan ? `score ${report.seoScore ?? report.overallHealthScore}` : "Not run",
      sourceType: "internal_knowledge",
      status: hasScan ? "verified" : "missing",
    },
    {
      id: "e-lh",
      label: "Lighthouse / Core Web Vitals",
      value: "Not measured",
      sourceType: "live_web",
      status: "missing",
    },
  ];

  const evidence = buildEvidenceBundle(
    "Website intelligence assembled from available internal sources only",
    evidenceItems
  );

  const baseConf = scoreConfidenceFromEvidence(evidenceItems);

  const seoMeasured = hasScan
    ? clamp(Math.round(report.seoScore ?? report.overallHealthScore ?? 60), 0, 100)
    : null;
  const conversionMeasured = hasAnalytics
    ? clamp(Math.round(conversionRate * 25), 0, 100)
    : null;
  const portfolioScore = hasPortfolio
    ? clamp(40 + portfolioCount * 4, 40, 92)
    : null;
  const bookingScore = bookingConversions > 0 || metrics.month.bookings > 0
    ? clamp(45 + bookingConversions * 8 + metrics.month.bookings * 3, 45, 90)
    : hasAnalytics
      ? 40
      : null;
  const analyticsCoverage = hasAnalytics
    ? clamp(55 + Math.min(40, Math.round(analytics.totals.uniqueSessions / 5)), 55, 95)
    : 15;
  const contentScore = hasHomepage ? 72 : 40;
  const brandScore = hasHomepage && hasPortfolio ? 78 : hasHomepage ? 60 : 45;

  const categories: WebsiteCategoryScore[] = [
    {
      id: "seo",
      label: "SEO",
      score: seoMeasured,
      scoreLabel: seoMeasured != null ? String(seoMeasured) : "Not scanned",
      trend: hasScan ? "flat" : "unknown",
      priority: seoMeasured != null && seoMeasured < 60 ? "high" : "medium",
      confidence: hasScan ? 82 : 40,
      truthKind: hasScan ? "Measured Data" : "Estimated Opportunity",
      summary: hasScan
        ? "Derived from last platform SEO scan of CMS pages."
        : "Run Intelligence Refresh to measure on-page SEO.",
    },
    {
      id: "performance",
      label: "Performance",
      score: null,
      scoreLabel: "Not measured",
      trend: "unknown",
      priority: "medium",
      confidence: 20,
      truthKind: "Industry Best Practice",
      summary: "Lighthouse / Core Web Vitals are not connected. No fabricated performance score.",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      score: report.accessibilityIssues?.length
        ? clamp(85 - report.accessibilityIssues.length * 8, 30, 85)
        : null,
      scoreLabel: report.accessibilityIssues?.length
        ? String(clamp(85 - report.accessibilityIssues.length * 8, 30, 85))
        : "Not scanned",
      trend: "unknown",
      priority: "high",
      confidence: report.accessibilityIssues?.length ? 70 : 25,
      truthKind: report.accessibilityIssues?.length ? "Measured Data" : "Industry Best Practice",
      summary: report.accessibilityIssues?.length
        ? `${report.accessibilityIssues.length} accessibility findings from platform scan.`
        : "No automated accessibility scan connected.",
    },
    {
      id: "conversion",
      label: "Conversion",
      score: conversionMeasured,
      scoreLabel: conversionMeasured != null ? String(conversionMeasured) : "Insufficient data",
      trend: conversionRate >= 2 ? "up" : conversionRate > 0 ? "flat" : "unknown",
      priority: conversionRate < 2 && hasAnalytics ? "critical" : "high",
      confidence: hasAnalytics ? 88 : 35,
      truthKind: hasAnalytics ? "Measured Data" : "Estimated Opportunity",
      summary: hasAnalytics
        ? `Measured inquiry conversion rate ${conversionRate}% (30d).`
        : "Need analytics volume before conversion scoring.",
    },
    {
      id: "content",
      label: "Content",
      score: contentScore,
      scoreLabel: String(contentScore),
      trend: "flat",
      priority: "medium",
      confidence: hasHomepage ? 65 : 45,
      truthKind: "AI Analysis",
      summary: hasHomepage
        ? "Homepage content present — clarity and luxury positioning reviewed qualitatively."
        : "Homepage content missing in CMS.",
    },
    {
      id: "brand",
      label: "Brand Consistency",
      score: brandScore,
      scoreLabel: String(brandScore),
      trend: "flat",
      priority: "medium",
      confidence: 58,
      truthKind: "AI Analysis",
      summary: "Qualitative brand consistency from CMS presence — not a visual pixel audit.",
    },
    {
      id: "mobile",
      label: "Mobile Experience",
      score: null,
      scoreLabel: "Not measured",
      trend: "unknown",
      priority: "high",
      confidence: 22,
      truthKind: "Industry Best Practice",
      summary: "No device-split analytics or mobile Lighthouse run available.",
    },
    {
      id: "portfolio",
      label: "Portfolio Quality",
      score: portfolioScore,
      scoreLabel: portfolioScore != null ? String(portfolioScore) : "Empty",
      trend: hasPortfolio ? "flat" : "down",
      priority: hasPortfolio ? "medium" : "high",
      confidence: hasPortfolio ? 75 : 50,
      truthKind: "Measured Data",
      summary: hasPortfolio
        ? `${portfolioCount} published projects feeding discoverability.`
        : "Publish portfolio work to strengthen trust and SEO.",
    },
    {
      id: "booking",
      label: "Booking Experience",
      score: bookingScore,
      scoreLabel: bookingScore != null ? String(bookingScore) : "No signal",
      trend: bookingConversions > 0 ? "up" : "unknown",
      priority: metrics.attention.abandonedInquiries > 3 ? "critical" : "high",
      confidence: hasAnalytics || metrics.month.bookings > 0 ? 80 : 40,
      truthKind: hasAnalytics ? "Measured Data" : "Estimated Opportunity",
      summary:
        metrics.attention.abandonedInquiries > 0
          ? `${metrics.attention.abandonedInquiries} stale inquiries need speed-to-lead attention.`
          : "Booking funnel signal from conversions and pipeline.",
    },
    {
      id: "analytics",
      label: "Analytics Coverage",
      score: analyticsCoverage,
      scoreLabel: String(analyticsCoverage),
      trend: hasAnalytics ? "up" : "down",
      priority: hasAnalytics ? "low" : "critical",
      confidence: 95,
      truthKind: "Measured Data",
      summary: hasAnalytics
        ? "First-party analytics events are flowing."
        : "Instrumentation gap — intelligence confidence will stay low until events arrive.",
    },
  ];

  const recommendations = buildRecommendations({
    hasAnalytics,
    hasScan,
    hasHomepage,
    hasPortfolio,
    conversionRate,
    bookingConversions,
    abandoned: metrics.attention.abandonedInquiries,
    portfolioCount,
    heat,
    report,
    siteSettings: Boolean(siteSettings),
  });

  const confidence = {
    ...baseConf,
    overall: baseConf.overall,
    seo: hasScan ? 82 : 38,
    ux: hasAnalytics ? 70 : 40,
    accessibility: report.accessibilityIssues?.length ? 68 : 25,
    performance: 18,
    conversion: hasAnalytics ? 86 : 35,
    brand: 55,
    content: hasHomepage ? 62 : 40,
    creative: baseConf.creative,
    business: baseConf.business,
    research: 22,
    production: baseConf.production,
    sales: hasAnalytics ? 74 : 40,
    reasoning: [
      hasAnalytics ? "Verified first-party analytics present" : "Analytics coverage incomplete",
      hasScan ? "Platform SEO scan available" : "SEO scan not run",
      "Lighthouse / live research not connected — performance & research confidence lowered",
    ],
  };

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (hasPortfolio) strengths.push("published portfolio inventory");
  if (hasHomepage) strengths.push("homepage content configured");
  if (conversionRate >= 2) strengths.push(`healthy ${conversionRate}% conversion rate`);
  if (!hasAnalytics) weaknesses.push("thin analytics coverage");
  if (!hasScan) weaknesses.push("no recent SEO platform scan");
  if (conversionRate < 2 && hasAnalytics) weaknesses.push("soft site-wide conversion");
  if (metrics.attention.abandonedInquiries > 3) {
    weaknesses.push(`${metrics.attention.abandonedInquiries} stale booking inquiries`);
  }

  const topRec = recommendations[0];
  const executiveSummary = [
    strengths.length
      ? `Current strengths include ${strengths.slice(0, 3).join(", ")}.`
      : "The site foundation is early — prioritize measurement and portfolio presence.",
    weaknesses.length
      ? `Biggest gaps: ${weaknesses.slice(0, 3).join("; ")}.`
      : "No critical measurement gaps detected in available sources.",
    topRec
      ? `Highest opportunity: ${topRec.title} (${topRec.truthKind}).`
      : "Highest opportunity will appear after analytics or SEO scan data arrives.",
    topRec
      ? `Immediate next action: ${topRec.nextStep}`
      : "Immediate next action: run Intelligence Refresh and confirm analytics events are firing.",
  ]
    .slice(0, 4)
    .join(" ");

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary,
    categories,
    dataSources,
    recommendations,
    confidence,
    evidence,
    heat: {
      topConverters: heat.topConverters.slice(0, 5).map((s) => ({
        path: s.path,
        conversionRate: s.conversionRate,
        views: s.views,
      })),
      weakCtas: heat.weakCtas.slice(0, 5).map((w) => ({ path: w.path, issue: w.issue })),
    },
    progress: {
      note: "Historical trend charts unlock as scans and completed actions accumulate.",
      completedCount: 0,
      openCount: recommendations.length,
    },
    provider: "rules",
  };
}

function buildRecommendations(ctx: {
  hasAnalytics: boolean;
  hasScan: boolean;
  hasHomepage: boolean;
  hasPortfolio: boolean;
  conversionRate: number;
  bookingConversions: number;
  abandoned: number;
  portfolioCount: number;
  heat: Awaited<ReturnType<typeof getWebsiteHeatIntelligence>>;
  report: {
    seoOpportunities?: string[];
    accessibilityIssues?: string[];
    performanceConcerns?: string[];
    conversionBlockers?: string[];
    missingCTAs?: string[];
    recommendations?: unknown[];
  };
  siteSettings: boolean;
}): WebsiteRecommendation[] {
  const recs: WebsiteRecommendation[] = [];

  const push = (r: Omit<WebsiteRecommendation, "roiScore" | "status">) => {
    recs.push({ ...r, roiScore: roiScore(r), status: "open" });
  };

  if (!ctx.hasAnalytics) {
    push({
      id: "analytics-coverage",
      title: "Confirm first-party analytics instrumentation",
      domain: "conversion",
      priority: "critical",
      confidence: 95,
      truthKind: "Measured Data",
      evidence: [
        {
          kind: "Measured Data",
          text: "Analytics summary returned zero meaningful traffic for the last 30 days",
        },
      ],
      reasoning:
        "Without measured traffic and conversions, SEO and conversion recommendations remain low-confidence estimates.",
      expectedBenefits: [
        "Unlock measured conversion scoring",
        "Enable page-level funnel diagnosis",
      ],
      potentialRisks: ["Delayed visibility into booking funnel leaks"],
      implementationDifficulty: "low",
      estimatedMinutes: 45,
      successMetrics: ["Pageview events > 0", "Conversion events firing on /book"],
      businessImpact: 90,
      uxImpact: 40,
      seoImpact: 30,
      actions: [
        { id: "open-analytics", label: "Open Analytics", href: "/admin/analytics", requiresApproval: false },
        { id: "create-task", label: "Create Task", href: "/admin/memory", requiresApproval: false },
      ],
      whySeeingThis: "Analytics coverage is a hard dependency for trustworthy website intelligence.",
      ifIgnored: "All conversion and funnel advice stays labeled as estimates.",
      nextStep: "Verify tracking on homepage, portfolio, and /book.",
    });
  }

  if (ctx.abandoned > 0) {
    push({
      id: "recover-stale-inquiries",
      title: "Recover stale booking inquiries",
      domain: "booking",
      priority: ctx.abandoned > 3 ? "critical" : "high",
      confidence: 88,
      truthKind: "Measured Data",
      evidence: [
        {
          kind: "Measured Data",
          text: `${ctx.abandoned} inquiries marked abandoned / stale in CRM pipeline`,
        },
      ],
      reasoning:
        "Speed-to-lead is a measured operational leak. Faster follow-up protects pipeline without changing the public site.",
      expectedBenefits: ["Recover qualified pipeline", "Improve close likelihood on warm leads"],
      potentialRisks: ["Over-contacting if leads already closed offline"],
      implementationDifficulty: "low",
      estimatedMinutes: 30,
      successMetrics: ["Reduce stale inquiry count", "Response within SLA"],
      businessImpact: 92,
      uxImpact: 35,
      seoImpact: 5,
      actions: [
        { id: "open-bookings", label: "Open Bookings", href: "/admin/submissions?type=booking", requiresApproval: false },
        { id: "schedule-followup", label: "Schedule Review", href: "/admin/email", requiresApproval: true },
      ],
      whySeeingThis: "CRM shows abandoned inquiries that still represent demand.",
      ifIgnored: "Warm pipeline cools and estimated revenue slips.",
      nextStep: "Work the highest-score inquiries in Booking Command Center today.",
    });
  }

  if (ctx.hasAnalytics && ctx.conversionRate < 2) {
    push({
      id: "homepage-cta-hierarchy",
      title: "Strengthen homepage CTA hierarchy",
      domain: "homepage",
      priority: "high",
      confidence: 72,
      truthKind: "AI Analysis",
      evidence: [
        {
          kind: "Measured Data",
          text: `Site conversion rate measured at ${ctx.conversionRate}% (30d)`,
        },
        {
          kind: "AI Analysis",
          text: "Soft conversion with existing traffic often indicates CTA clarity or trust-signal gaps",
        },
        {
          kind: "Industry Best Practice",
          text: "Luxury sites typically present one primary consultation CTA above the fold",
        },
      ],
      reasoning:
        "Measured conversion is soft relative to traffic. Recommendation is diagnostic — not a promised lift percentage.",
      expectedBenefits: [
        "Clearer primary action for visitors",
        "Better consultation request intent",
      ],
      potentialRisks: ["Over-aggressive CTAs can harm luxury brand perception"],
      implementationDifficulty: "medium",
      estimatedMinutes: 90,
      successMetrics: ["Consultation / booking conversion rate", "Homepage → /book click rate"],
      businessImpact: 80,
      uxImpact: 85,
      seoImpact: 15,
      actions: [
        { id: "edit-homepage", label: "Edit Homepage", href: "/admin/homepage", requiresApproval: false },
        { id: "rewrite-cta", label: "Rewrite CTA", href: "/admin/marketing", requiresApproval: true },
        { id: "add-testimonials", label: "Add Testimonials", href: "/admin/homepage", requiresApproval: false },
      ],
      whySeeingThis: "Measured conversion is below a healthy 2% threshold with analytics present.",
      ifIgnored: "Traffic continues without proportional inquiry growth.",
      nextStep: "Audit hero headline, primary CTA, and trust signals on mobile and desktop.",
    });
  }

  for (const weak of ctx.heat.weakCtas.slice(0, 3)) {
    push({
      id: `weak-cta-${weak.path.replace(/\W+/g, "-")}`,
      title: `Improve CTA on ${weak.path}`,
      domain: "conversion",
      priority: "high",
      confidence: 78,
      truthKind: "Measured Data",
      evidence: [{ kind: "Measured Data", text: weak.issue }],
      reasoning:
        "High views with low measured conversion on this path suggest a CTA, trust, or offer mismatch.",
      expectedBenefits: ["Better path-level conversion", "Clearer next step for visitors"],
      potentialRisks: ["Copy changes need brand review"],
      implementationDifficulty: "medium",
      estimatedMinutes: 60,
      successMetrics: [`Conversion rate on ${weak.path}`, "Click-through to /book"],
      businessImpact: 75,
      uxImpact: 80,
      seoImpact: 10,
      actions: [
        { id: "view-analytics", label: "View Analytics", href: "/admin/analytics", requiresApproval: false },
        { id: "assign-dev", label: "Assign Developer", href: "/admin/memory", requiresApproval: false },
      ],
      whySeeingThis: "Path-level analytics show traffic without proportional conversions.",
      ifIgnored: "High-intent traffic may exit without inquiry.",
      nextStep: "Review CTA placement, wording, and proof on that page.",
    });
  }

  if (!ctx.hasScan) {
    push({
      id: "run-seo-scan",
      title: "Run platform SEO & content scan",
      domain: "seo",
      priority: "high",
      confidence: 90,
      truthKind: "Measured Data",
      evidence: [
        {
          kind: "Measured Data",
          text: "No website-health memory from Intelligence Refresh",
        },
      ],
      reasoning:
        "On-page SEO findings (meta, headings, CTAs) come from the platform scanner — not invented rankings.",
      expectedBenefits: ["Verified meta/alt/CTA gaps", "Evidence-backed SEO queue"],
      potentialRisks: ["Scan may take a few minutes"],
      implementationDifficulty: "low",
      estimatedMinutes: 10,
      successMetrics: ["website-health memory present", "SEO category score becomes measured"],
      businessImpact: 70,
      uxImpact: 40,
      seoImpact: 95,
      actions: [
        { id: "refresh", label: "Refresh Intelligence", href: "/admin/memory", requiresApproval: false },
        { id: "seo-report", label: "Generate SEO Report", href: "/admin/website", requiresApproval: false },
      ],
      whySeeingThis: "SEO category cannot be measured until a scan exists.",
      ifIgnored: "SEO advice stays speculative.",
      nextStep: "Trigger Intelligence Refresh from Memory / Business Brain.",
    });
  } else if (ctx.report.seoOpportunities?.length) {
    for (const opp of ctx.report.seoOpportunities.slice(0, 3)) {
      push({
        id: `seo-opp-${opp.slice(0, 24).replace(/\W+/g, "-")}`,
        title: opp.slice(0, 90),
        domain: "seo",
        priority: "medium",
        confidence: 74,
        truthKind: "Measured Data",
        evidence: [{ kind: "Measured Data", text: opp }],
        reasoning: "Surfaced by the last platform SEO/content scan of CMS routes.",
        expectedBenefits: ["Improved on-page clarity", "Better crawlability of key pages"],
        potentialRisks: ["Copy changes require brand review"],
        implementationDifficulty: "medium",
        estimatedMinutes: 45,
        successMetrics: ["Issue cleared on next scan", "Meta coverage"],
        businessImpact: 55,
        uxImpact: 30,
        seoImpact: 85,
        actions: [
          { id: "gen-meta", label: "Generate Meta Titles", href: "/admin/marketing", requiresApproval: true },
          { id: "mark-done", label: "Mark Complete", requiresApproval: false },
        ],
        whySeeingThis: "Platform scan recorded this SEO opportunity.",
        ifIgnored: "Discoverability gaps persist on scanned pages.",
        nextStep: "Apply meta/heading fix and re-scan.",
      });
    }
  }

  if (ctx.report.accessibilityIssues?.length) {
    push({
      id: "a11y-pass",
      title: "Resolve accessibility findings from scan",
      domain: "accessibility",
      priority: "high",
      confidence: 70,
      truthKind: "Measured Data",
      evidence: ctx.report.accessibilityIssues.slice(0, 4).map((t) => ({
        kind: "Measured Data" as const,
        text: t,
      })),
      reasoning:
        "Accessibility issues affect real users and can suppress conversion. Fixes are standards-based.",
      expectedBenefits: ["Broader usability", "Reduced form friction"],
      potentialRisks: ["Visual redesign needed for contrast fixes"],
      implementationDifficulty: "medium",
      estimatedMinutes: 120,
      successMetrics: ["Issue count down on next scan", "Form completion"],
      businessImpact: 60,
      uxImpact: 90,
      seoImpact: 25,
      actions: [
        { id: "gen-alt", label: "Generate Alt Text", href: "/admin/portfolio", requiresApproval: true },
        { id: "create-task", label: "Create Task", href: "/admin/memory", requiresApproval: false },
      ],
      whySeeingThis: "Platform scan listed accessibility issues.",
      ifIgnored: "Users with assistive tech may fail critical flows.",
      nextStep: "Prioritize alt text, labels, and focus states on /book.",
    });
  } else {
    push({
      id: "a11y-best-practice",
      title: "Audit alt text, contrast, and keyboard flow",
      domain: "accessibility",
      priority: "medium",
      confidence: 55,
      truthKind: "Industry Best Practice",
      evidence: [
        {
          kind: "Industry Best Practice",
          text: "WCAG-aligned alt text, contrast, and keyboard access are expected on premium sites",
        },
      ],
      reasoning:
        "No automated a11y scan is connected. This is a best-practice checklist — not a measured Lighthouse a11y score.",
      expectedBenefits: ["Inclusive experience", "Fewer form abandonment risks"],
      potentialRisks: ["Time investment without a baseline score yet"],
      implementationDifficulty: "medium",
      estimatedMinutes: 90,
      successMetrics: ["Alt coverage on portfolio", "Keyboard reachability of CTAs"],
      businessImpact: 45,
      uxImpact: 80,
      seoImpact: 20,
      actions: [
        { id: "gen-alt", label: "Generate Alt Text", href: "/admin/portfolio", requiresApproval: true },
        { id: "schedule", label: "Schedule Review", href: "/admin/website", requiresApproval: false },
      ],
      whySeeingThis: "Accessibility category has no measured scan yet.",
      ifIgnored: "Unknown a11y debt accumulates.",
      nextStep: "Start with portfolio alt text and /book form labels.",
    });
  }

  push({
    id: "performance-lighthouse",
    title: "Connect performance measurement (Lighthouse / CWV)",
    domain: "performance",
    priority: "medium",
    confidence: 92,
    truthKind: "Industry Best Practice",
    evidence: [
      {
        kind: "Industry Best Practice",
        text: "Core Web Vitals (LCP, INP, CLS) require a real lab or field measurement tool",
      },
      {
        kind: "Measured Data",
        text: "No Lighthouse connector is wired in ÉLEVÉ OS",
      },
    ],
    reasoning:
      "ÉLEVÉ OS will not invent PageSpeed scores. Connecting measurement unlocks honest Performance category scoring.",
    expectedBenefits: ["Measured LCP/INP/CLS", "Prioritized image and JS fixes"],
    potentialRisks: ["None — measurement-only first step"],
    implementationDifficulty: "medium",
    estimatedMinutes: 120,
    successMetrics: ["Performance category becomes Measured Data"],
    businessImpact: 50,
    uxImpact: 70,
    seoImpact: 65,
    actions: [
      { id: "connectors", label: "View Connectors", href: "/admin/memory", requiresApproval: false },
      { id: "create-task", label: "Create Task", requiresApproval: false },
    ],
    whySeeingThis: "Performance is explicitly unmeasured.",
    ifIgnored: "Performance advice stays unlabeled speculation — which we refuse to fabricate.",
    nextStep: "Plan Lighthouse or CrUX connector; until then treat performance as best practice only.",
  });

  if (ctx.hasPortfolio && ctx.portfolioCount < 6) {
    push({
      id: "portfolio-depth",
      title: "Expand featured portfolio depth",
      domain: "portfolio",
      priority: "medium",
      confidence: 68,
      truthKind: "Estimated Opportunity",
      evidence: [
        {
          kind: "Measured Data",
          text: `${ctx.portfolioCount} published portfolio projects`,
        },
        {
          kind: "Industry Best Practice",
          text: "Luxury creative sites typically showcase a curated but sufficient body of work",
        },
      ],
      reasoning:
        "Thin portfolios can weaken trust. This is an estimated opportunity — not a traffic forecast.",
      expectedBenefits: ["Stronger proof", "More internal-link targets for SEO"],
      potentialRisks: ["Diluting quality if publishing unfinished work"],
      implementationDifficulty: "medium",
      estimatedMinutes: 180,
      successMetrics: ["Published project count", "Portfolio page engagement"],
      businessImpact: 65,
      uxImpact: 70,
      seoImpact: 55,
      actions: [
        { id: "portfolio", label: "Open Portfolio", href: "/admin/portfolio", requiresApproval: false },
        { id: "cross-link", label: "Improve Internal Links", href: "/admin/portfolio", requiresApproval: false },
      ],
      whySeeingThis: "Published portfolio count is below a healthy luxury showcase threshold.",
      ifIgnored: "Trust and SEO surface area stay limited.",
      nextStep: "Publish 2–3 strongest projects with SEO titles, alt text, and booking CTAs.",
    });
  }

  if (!ctx.hasHomepage) {
    push({
      id: "homepage-cms",
      title: "Configure homepage content in CMS",
      domain: "homepage",
      priority: "critical",
      confidence: 95,
      truthKind: "Measured Data",
      evidence: [{ kind: "Measured Data", text: "Homepage siteContent record missing" }],
      reasoning: "Without homepage CMS content, brand and conversion hierarchy cannot be managed.",
      expectedBenefits: ["Controllable hero/CTA", "Brand messaging SoT"],
      potentialRisks: ["None"],
      implementationDifficulty: "low",
      estimatedMinutes: 60,
      successMetrics: ["Homepage content saved"],
      businessImpact: 85,
      uxImpact: 90,
      seoImpact: 50,
      actions: [
        { id: "edit-home", label: "Edit Homepage", href: "/admin/homepage", requiresApproval: false },
      ],
      whySeeingThis: "CMS has no homepage content key.",
      ifIgnored: "Public homepage drifts from OS control.",
      nextStep: "Author hero, proof, and primary CTA in Homepage admin.",
    });
  }

  return recs
    .map((r) => ({ ...r, roiScore: roiScore(r) }))
    .sort((a, b) => b.roiScore - a.roiScore);
}
