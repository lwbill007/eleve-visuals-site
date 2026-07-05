import { getMemory } from "../memory/store";
import type { ExecutiveOpportunity } from "../types";
import { getExecutiveOpportunities } from "./opportunity-engine";
import { getOperatorMetrics } from "./business-operator";

/** Website & conversion opportunities from knowledge engine + analytics. */
export async function getWebsiteOpportunities(): Promise<ExecutiveOpportunity[]> {
  const [metrics] = await Promise.all([getOperatorMetrics()]);
  const opportunities: ExecutiveOpportunity[] = [];

  const seoMemory = await getMemory("marketing", "executive_report", "website-health").catch(() => null);
  const seoValue = (seoMemory?.value ?? {}) as {
    seoScore?: number;
    recommendations?: string[];
    issues?: { title: string; detail: string; severity: string }[];
  };

  if (typeof seoValue.seoScore === "number" && seoValue.seoScore < 75) {
    opportunities.push({
      id: "seo-improvement",
      title: "Improve SEO health across key pages",
      detail: `Website intelligence reports SEO at ${seoValue.seoScore}/100. Fixing metadata and internal links can lift organic inquiries.`,
      why: "Knowledge engine scan detected SEO gaps on high-traffic pages.",
      category: "marketing",
      expectedRevenue: Math.round(metrics.traffic.visitors30 * 0.02 * 1200),
      confidence: 0.68,
      effort: "medium",
      urgency: "medium",
      impact: `+${Math.round(metrics.traffic.visitors30 * 0.02)} potential inquiries/mo`,
      evidence: seoValue.recommendations?.slice(0, 3) ?? ["Run Intelligence Refresh for full SEO audit"],
      actions: [
        { id: "memory", label: "Knowledge Engine", type: "navigate", href: "/admin/memory" },
        { id: "marketing", label: "SEO Draft", type: "create_campaign", href: "/admin/marketing?task=seo_meta" },
      ],
      estimatedMinutes: 40,
    });
  }

  if (metrics.traffic.conversionRate < 2.5 && metrics.traffic.visitors30 > 50) {
    const lost = Math.round(metrics.traffic.visitors30 * (2.5 - metrics.traffic.conversionRate) / 100 * 1500);
    opportunities.push({
      id: "conversion-bottleneck",
      title: "Fix conversion bottleneck on top landing pages",
      detail: `${metrics.traffic.visitors30} visitors / 30d at ${metrics.traffic.conversionRate}% conversion — below luxury studio benchmark (~2.5–4%).`,
      why: "High traffic without proportional inquiries indicates CTA, page speed, or messaging friction.",
      category: "marketing",
      expectedRevenue: lost,
      confidence: 0.7,
      effort: "medium",
      urgency: metrics.traffic.conversionRate < 1.5 ? "high" : "medium",
      impact: `~$${lost.toLocaleString()} addressable`,
      evidence: [`Top page: ${metrics.traffic.topPage}`, `${metrics.traffic.conversionRate}% site conversion`],
      actions: [
        { id: "analytics", label: "View Analytics", type: "navigate", href: "/admin/analytics" },
        { id: "portfolio", label: "Edit Portfolio", type: "navigate", href: "/admin/portfolio" },
      ],
      estimatedMinutes: 60,
    });
  }

  const issues = Array.isArray(seoValue.issues) ? seoValue.issues : [];
  for (const issue of issues.filter((i) => i.severity === "high").slice(0, 2)) {
    opportunities.push({
      id: `web-issue-${issue.title.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
      title: issue.title,
      detail: issue.detail,
      why: "Detected by platform intelligence scan.",
      category: "marketing",
      expectedRevenue: 800,
      confidence: 0.62,
      effort: "low",
      urgency: "medium",
      impact: "Conversion & UX",
      evidence: [issue.detail],
      actions: [{ id: "memory", label: "View in Memory", type: "navigate", href: "/admin/memory" }],
      estimatedMinutes: 25,
    });
  }

  return opportunities;
}

export async function getAllExecutiveOpportunities(): Promise<ExecutiveOpportunity[]> {
  const [core, website] = await Promise.all([getExecutiveOpportunities(), getWebsiteOpportunities()]);
  const seen = new Set<string>();
  const merged: ExecutiveOpportunity[] = [];
  for (const o of [...core, ...website]) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    merged.push(o);
  }
  return merged.sort((a, b) => b.expectedRevenue * b.confidence - a.expectedRevenue * a.confidence).slice(0, 15);
}
