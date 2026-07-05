import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getAdminDashboardOS } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";
import type { WebsiteOptimizationResult } from "../types";

export async function analyzeWebsiteOptimization(): Promise<WebsiteOptimizationResult> {
  const [analytics, dashboard, portfolio, homepage] = await Promise.all([
    getAnalyticsSummary(30),
    getAdminDashboardOS(),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
    prisma.siteContent.findUnique({ where: { key: "homepage" } }),
  ]);

  const topPages = analytics.topPages.slice(0, 10);
  const conversionRate = analytics.totals.conversionRate;
  const bookingConversions = analytics.conversions.booking ?? 0;

  const sections: WebsiteOptimizationResult["sections"] = [];

  sections.push({
    area: "Homepage",
    score: homepage ? 75 : 50,
    findings: [
      homepage ? "Homepage content configured" : "Homepage content missing — configure in admin",
      `${analytics.totals.pageviews} pageviews in 30 days`,
      conversionRate < 2 ? "Conversion rate below 2% — strengthen CTA" : "Conversion rate healthy",
    ],
    recommendations: [
      "Feature highest-converting portfolio on hero",
      "Add social proof above the fold",
      conversionRate < 2 ? "Simplify booking CTA to single primary action" : "Test secondary CTA for Sessions",
    ],
  });

  sections.push({
    area: "Portfolio",
    score: portfolio > 5 ? 80 : 55,
    findings: [
      `${portfolio} published projects`,
      topPages.find((p) => p.path.includes("/portfolio"))
        ? "Portfolio drives significant traffic"
        : "Portfolio underperforming in traffic",
    ],
    recommendations: [
      "Ensure every gallery has SEO metadata and alt text",
      "Cross-link portfolio to booking packages",
      "Feature Cinema Noir or top performer on homepage",
    ],
  });

  sections.push({
    area: "Booking Form",
    score: bookingConversions > 0 ? 70 : 45,
    findings: [
      `${bookingConversions} booking conversions in 30 days`,
      `${dashboard.metrics.bookings.pending} pending inquiries`,
    ],
    recommendations: [
      "Reduce form fields to essentials",
      "Add budget range pre-selection for faster qualification",
      dashboard.metrics.bookings.pending > 5 ? "Add auto-confirmation email" : "Maintain fast response SLA",
    ],
  });

  sections.push({
    area: "SEO",
    score: 65,
    findings: analytics.topSources.slice(0, 3).map((s) => `${s.source}: ${s.visits} visits`),
    recommendations: [
      "Optimize meta titles for top portfolio pages",
      "Add structured data for local photography business",
      "Create blog content around ÉLEVÉ Sessions",
    ],
  });

  sections.push({
    area: "Accessibility",
    score: 60,
    findings: ["Alt text coverage varies across portfolio"],
    recommendations: [
      "Run alt text generation on all gallery images",
      "Ensure contrast ratios on CTA buttons",
      "Add skip navigation link",
    ],
  });

  const overallScore = Math.round(sections.reduce((s, sec) => s + sec.score, 0) / sections.length);

  let aiSummary = "";
  const aiResult = await generateAIContent({
    task: "general",
    prompt: "Summarize website optimization priorities in 3 bullet points. Be specific and actionable.",
    context: { sections, conversionRate, topPages: topPages.slice(0, 5) },
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
