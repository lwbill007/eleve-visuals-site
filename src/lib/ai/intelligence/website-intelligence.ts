import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "./business-operator";
import { getMemory } from "../memory/store";

export interface WebsiteIntelligence {
  generatedAt: string;
  overallScore: number;
  performanceScore: number;
  seoScore: number;
  conversionScore: number;
  accessibilityNotes: string[];
  topPages: { path: string; views: number; recommendation: string }[];
  weakCTAs: string[];
  recommendations: {
    id: string;
    title: string;
    detail: string;
    impact: string;
    urgency: "high" | "medium" | "low";
    href: string;
  }[];
}

export async function getWebsiteIntelligence(): Promise<WebsiteIntelligence> {
  const [metrics, analytics, reportMem] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getMemory("marketing", "executive_report", "website-health").catch(() => null),
  ]);

  const report = (reportMem?.value ?? {}) as {
    overallHealthScore?: number;
    seoScore?: number;
    uxScore?: number;
    recommendations?: string[];
  };

  const conversionScore = Math.min(100, Math.round(metrics.traffic.conversionRate * 25));
  const seoScore = report.seoScore ?? Math.min(100, 50 + Math.round(analytics.totals.uniqueSessions / 20));
  const performanceScore = report.uxScore ?? 72;
  const overallScore = Math.round(
    (conversionScore + seoScore + performanceScore + (report.overallHealthScore ?? 70)) / 4
  );

  const topPages = analytics.topPages.slice(0, 5).map((p) => ({
    path: p.path,
    views: p.views,
    recommendation:
      p.path === "/book"
        ? "Ensure booking CTA is above fold on referring pages"
        : p.path.startsWith("/portfolio")
          ? "Add inquiry CTA after gallery"
          : "Review meta title and internal links",
  }));

  const weakCTAs: string[] = [];
  if (metrics.traffic.conversionRate < 2) weakCTAs.push("Site-wide inquiry rate below 2%");
  if (metrics.traffic.topPage === "/" && conversionScore < 60) {
    weakCTAs.push("Homepage traffic high but conversion soft — strengthen hero CTA");
  }

  const recommendations: WebsiteIntelligence["recommendations"] = [
    ...(report.recommendations ?? []).slice(0, 4).map((r, i) => ({
      id: `seo-rec-${i}`,
      title: r.slice(0, 80),
      detail: r,
      impact: "SEO & discovery",
      urgency: "medium" as const,
      href: "/admin/memory",
    })),
  ];

  if (metrics.attention.abandonedInquiries > 0) {
    recommendations.unshift({
      id: "booking-flow",
      title: "Recover abandoned booking flow",
      detail: `${metrics.attention.abandonedInquiries} inquiries stale — speed-to-lead fixes conversion leak`,
      impact: `~$${(metrics.attention.abandonedInquiries * 1200).toLocaleString()} pipeline`,
      urgency: "high" as const,
      href: "/admin/bookings-ai",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    performanceScore,
    seoScore,
    conversionScore,
    accessibilityNotes: [
      "Run Lighthouse audit on /portfolio and /sessions for a11y regressions",
      "Ensure form labels and focus states on /book and session applications",
    ],
    topPages,
    weakCTAs,
    recommendations: recommendations.slice(0, 8),
  };
}
