import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getMemory } from "../memory/store";
import { recommendExperiments } from "../marketing/experiment-engine";
import type { BusinessAction } from "../types";

export interface RevenueLeak {
  id: string;
  title: string;
  reason: string;
  category:
    | "cta"
    | "booking_flow"
    | "navigation"
    | "performance"
    | "trust"
    | "seo"
    | "pricing"
    | "portfolio"
    | "follow_up"
    | "abandonment"
    | "engagement"
    | "upsell"
    | "retention";
  estimatedLoss: number;
  recoveryPotential: number;
  confidence: number;
  evidence: string[];
  actions: BusinessAction[];
}

function leak(
  partial: Omit<RevenueLeak, "id"> & { id?: string }
): RevenueLeak {
  return {
    id: partial.id ?? `leak-${partial.category}-${partial.title.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`,
    ...partial,
  };
}

/** Continuously detect where revenue is being lost across the business. */
export async function detectRevenueLeaks(): Promise<RevenueLeak[]> {
  const [metrics, analytics, websiteHealth] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getMemory("marketing", "executive_report", "website-health").catch(() => null),
  ]);

  const leaks: RevenueLeak[] = [];
  const avgValue =
    metrics.month.bookings > 0
      ? metrics.revenue.thisMonth / metrics.month.bookings
      : 1500;

  if (metrics.attention.abandonedInquiries > 0) {
    const loss = Math.round(metrics.attention.abandonedInquiries * avgValue * 0.35);
    leaks.push(
      leak({
        title: `${metrics.attention.abandonedInquiries} stale booking inquiries`,
        reason: "Inquiries without response for 3+ days — leads go cold before consultation",
        category: "follow_up",
        estimatedLoss: loss,
        recoveryPotential: Math.round(loss * 0.6),
        confidence: 0.85,
        evidence: [`${metrics.attention.abandonedInquiries} untouched inquiries`, "Industry recovery rate: 15–35%"],
        actions: [
          { id: "submissions", label: "Review inquiries", type: "navigate", href: "/admin/submissions?type=booking" },
          { id: "automations", label: "Set up follow-up", type: "navigate", href: "/admin/automations" },
        ],
      })
    );
  }

  if (metrics.attention.followUpClients > 0) {
    leaks.push(
      leak({
        title: `$${metrics.attention.followUpValue.toLocaleString()} in inactive client value`,
        reason: "Past clients with no activity in 60+ days — repeat bookings and referrals at risk",
        category: "retention",
        estimatedLoss: metrics.attention.followUpValue,
        recoveryPotential: Math.round(metrics.attention.followUpValue * 0.25),
        confidence: 0.78,
        evidence: [`${metrics.attention.followUpClients} clients need follow-up`],
        actions: [
          { id: "crm", label: "Open CRM", type: "navigate", href: "/admin/crm" },
          { id: "marketing", label: "Re-engagement campaign", type: "navigate", href: "/admin/marketing?task=follow_up" },
        ],
      })
    );
  }

  if (metrics.traffic.conversionRate < 2.5 && metrics.traffic.visitors30 > 30) {
    const gap = 2.5 - metrics.traffic.conversionRate;
    const missedInquiries = Math.round(metrics.traffic.visitors30 * (gap / 100));
    const loss = missedInquiries * avgValue;
    leaks.push(
      leak({
        title: "Conversion below luxury studio benchmark",
        reason: `Site converts at ${metrics.traffic.conversionRate}% vs 2.5–4% benchmark — weak CTAs, friction, or messaging mismatch`,
        category: "booking_flow",
        estimatedLoss: loss,
        recoveryPotential: Math.round(loss * 0.4),
        confidence: 0.72,
        evidence: [
          `${metrics.traffic.visitors30} visitors (30d)`,
          `${metrics.traffic.conversionRate}% conversion`,
          `Top page: ${metrics.traffic.topPage}`,
        ],
        actions: [
          { id: "analytics", label: "View analytics", type: "navigate", href: "/admin/analytics" },
          { id: "opportunities", label: "View opportunities", type: "navigate", href: "/admin/opportunities" },
        ],
      })
    );
  }

  const healthValue = (websiteHealth?.value ?? {}) as {
    issues?: { title: string; severity: string }[];
    overallHealthScore?: number;
  };
  if (typeof healthValue.overallHealthScore === "number" && healthValue.overallHealthScore < 70) {
    leaks.push(
      leak({
        title: "Website health below target",
        reason: "Platform intelligence scan detected SEO, UX, or content gaps reducing qualified inquiries",
        category: "seo",
        estimatedLoss: Math.round(metrics.traffic.visitors30 * 0.03 * avgValue),
        recoveryPotential: Math.round(metrics.traffic.visitors30 * 0.02 * avgValue),
        confidence: 0.68,
        evidence: [
          `Health score: ${healthValue.overallHealthScore}/100`,
          ...(healthValue.issues?.filter((i) => i.severity === "high").map((i) => i.title) ?? []),
        ],
        actions: [
          { id: "memory", label: "Refresh intelligence", type: "navigate", href: "/admin/memory" },
        ],
      })
    );
  }

  const topPage = analytics.topPages[0];
  if (topPage && topPage.views > 50) {
    const hasBookingPath = analytics.topPages.some((p) => p.path.includes("/book"));
    if (!hasBookingPath && topPage.path.startsWith("/portfolio")) {
      leaks.push(
        leak({
          title: "High-traffic portfolio without conversion path",
          reason: `${topPage.path} drives ${topPage.views} views but may lack strong booking CTA`,
          category: "cta",
          estimatedLoss: Math.round(topPage.views * 0.02 * avgValue),
          recoveryPotential: Math.round(topPage.views * 0.015 * avgValue),
          confidence: 0.65,
          evidence: [`${topPage.views} views on ${topPage.path}`, "No /book in top pages"],
          actions: [
            { id: "portfolio", label: "Edit portfolio", type: "navigate", href: "/admin/portfolio" },
          ],
        })
      );
    }
  }

  if (metrics.attention.galleriesAwaiting > 0) {
    leaks.push(
      leak({
        title: `${metrics.attention.galleriesAwaiting} galleries awaiting delivery`,
        reason: "Delayed delivery risks satisfaction, referrals, and repeat bookings",
        category: "retention",
        estimatedLoss: metrics.attention.galleriesAwaiting * avgValue * 0.15,
        recoveryPotential: metrics.attention.galleriesAwaiting * avgValue * 0.1,
        confidence: 0.8,
        evidence: [`${metrics.attention.galleriesAwaiting} pending galleries`],
        actions: [
          { id: "submissions", label: "View bookings", type: "navigate", href: "/admin/submissions?type=booking" },
        ],
      })
    );
  }

  return leaks.sort((a, b) => b.recoveryPotential * b.confidence - a.recoveryPotential * a.confidence);
}

export async function getExperimentBacklog() {
  const experiments = await recommendExperiments();
  return experiments
    .map((e) => ({
      ...e,
      expectedRoi: Math.round(e.confidence * 100),
    }))
    .sort((a, b) => b.expectedRoi - a.expectedRoi);
}

export function totalLeakExposure(leaks: RevenueLeak[]): { loss: number; recoverable: number } {
  return {
    loss: leaks.reduce((s, l) => s + l.estimatedLoss, 0),
    recoverable: leaks.reduce((s, l) => s + l.recoveryPotential * l.confidence, 0),
  };
}
