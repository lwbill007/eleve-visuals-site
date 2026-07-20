import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminDashboardOSCached } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";
import type { WebsiteOptimizationResult } from "../types";

/** Score only when grounded in measured signals; otherwise 0 = Unknown. */
function measuredOrUnknown(hasSignal: boolean, score: number): number {
  return hasSignal ? score : 0;
}

export async function analyzeWebsiteOptimization(): Promise<WebsiteOptimizationResult> {
  const [analytics, dashboard, portfolio, homepage] = await Promise.all([
    getAnalyticsSummary(30),
    getAdminDashboardOSCached(),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
    prisma.siteContent.findUnique({ where: { key: "homepage" } }),
  ]);

  const topPages = analytics.topPages.slice(0, 10);
  const conversionRate = analytics.totals.conversionRate;
  const bookingConversions = analytics.conversions.booking ?? 0;
  const hasTraffic = analytics.totals.pageviews > 0;
  const hasPortfolioTraffic = Boolean(topPages.find((p) => p.path.includes("/portfolio")));

  const sections: WebsiteOptimizationResult["sections"] = [];

  sections.push({
    area: "Homepage",
    score: measuredOrUnknown(
      Boolean(homepage) && hasTraffic,
      conversionRate >= 2 ? 75 : conversionRate > 0 ? 55 : 40
    ),
    findings: [
      homepage ? "Homepage content configured (Measured)" : "Homepage content missing — configure in admin",
      hasTraffic
        ? `${analytics.totals.pageviews} pageviews in 30 days (Measured)`
        : "Traffic Unknown — no analytics pageviews yet",
      hasTraffic
        ? conversionRate < 2
          ? `Conversion rate ${conversionRate}% (Measured) — below 2%`
          : `Conversion rate ${conversionRate}% (Measured)`
        : "Conversion Unknown until traffic exists",
    ],
    recommendations: [
      "Feature highest-converting portfolio on hero",
      "Add social proof above the fold",
      conversionRate < 2 && hasTraffic
        ? "Simplify booking CTA to single primary action"
        : "Test secondary CTA for Sessions when traffic exists",
    ],
  });

  sections.push({
    area: "Portfolio",
    score: measuredOrUnknown(portfolio > 0 && hasPortfolioTraffic, portfolio > 5 ? 80 : 55),
    findings: [
      `${portfolio} published projects (Measured)`,
      hasPortfolioTraffic
        ? "Portfolio appears in top pages (Measured)"
        : "Portfolio traffic Unknown / not in top pages",
    ],
    recommendations: [
      "Ensure every gallery has SEO metadata and alt text",
      "Cross-link portfolio to booking packages",
      "Feature top performers on homepage only after view data exists",
    ],
  });

  sections.push({
    area: "Booking Form",
    score: measuredOrUnknown(
      bookingConversions > 0 || dashboard.metrics.bookings.pending > 0,
      bookingConversions > 0 ? 70 : 45
    ),
    findings: [
      `${bookingConversions} booking conversions in 30 days (Measured)`,
      `${dashboard.metrics.bookings.pending} pending inquiries (Measured)`,
    ],
    recommendations: [
      "Reduce form fields to essentials",
      "Add budget range pre-selection for faster qualification",
      dashboard.metrics.bookings.pending > 5 ? "Add auto-confirmation email" : "Maintain fast response SLA",
    ],
  });

  sections.push({
    area: "SEO",
    score: 0,
    findings: [
      "SEO score Unknown — no Lighthouse/Search Console connector",
      ...(hasTraffic
        ? analytics.topSources.slice(0, 3).map((s) => `${s.source}: ${s.visits} visits (Measured traffic, not SEO rank)`)
        : ["No traffic sources to attribute"]),
    ],
    recommendations: [
      "Connect Search Console / Lighthouse before claiming SEO scores",
      "Optimize meta titles for top portfolio pages",
      "Add structured data for local photography business",
    ],
  });

  sections.push({
    area: "Accessibility",
    score: 0,
    findings: [
      "Accessibility score Unknown — no automated a11y audit connected",
      "Alt text coverage not measured site-wide",
    ],
    recommendations: [
      "Wire axe/Lighthouse a11y before scoring Accessibility",
      "Run alt text generation on all gallery images",
      "Ensure contrast ratios on CTA buttons",
    ],
  });

  const scored = sections.filter((s) => s.score > 0);
  const overallScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, sec) => s + sec.score, 0) / scored.length)
      : 0;

  let aiSummary = "";
  const aiResult = await generateAIContent({
    task: "general",
    prompt:
      "Summarize website optimization priorities in 3 bullet points. Use only provided findings. Never invent Lighthouse, SEO ranks, or conversion lifts. If score is 0, say Not measured.",
    context: { sections, conversionRate, topPages: topPages.slice(0, 5), overallScore },
  });
  aiSummary = aiResult.content;

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    conversionRate,
    sections,
    aiSummary,
    provider: aiResult.provider,
  };
}
