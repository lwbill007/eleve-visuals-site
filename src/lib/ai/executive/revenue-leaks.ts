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
  /** Heuristic only — always treat as AI Prediction, never ledger fact */
  estimatedLoss: number;
  recoveryPotential: number;
  confidence: number;
  evidence: string[];
  actions: BusinessAction[];
  truthKind: "AI Prediction";
  formula: string;
  financialDataSufficient: boolean;
}

function leak(
  partial: Omit<RevenueLeak, "id" | "truthKind" | "financialDataSufficient"> & {
    id?: string;
    financialDataSufficient?: boolean;
  }
): RevenueLeak {
  return {
    id: partial.id ?? `leak-${partial.category}-${partial.title.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`,
    truthKind: "AI Prediction",
    financialDataSufficient: partial.financialDataSufficient ?? false,
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
        reason: "Inquiries without response for 3+ days — leads may go cold before consultation",
        category: "follow_up",
        estimatedLoss: loss,
        recoveryPotential: Math.round(loss * 0.6),
        confidence: 0.55,
        formula: "staleInquiries × avgProjectValue × 0.35 (heuristic — not measured recovery)",
        evidence: [
          `${metrics.attention.abandonedInquiries} untouched inquiries (Measured)`,
          "AI Prediction: dollar exposure uses heuristic coefficients — not studio-verified recovery",
          "Industry Best Practice ranges are not cited as ÉLEVÉ facts",
        ],
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
        title: `${metrics.attention.followUpClients} inactive clients (historical CRM value present)`,
        reason: "Past clients with no activity in 60+ days — repeat risk is real; $ recovery is unknown",
        category: "retention",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.7,
        formula: "No $ projection — historical CRM value is not the same as recoverable revenue",
        financialDataSufficient: false,
        evidence: [
          `${metrics.attention.followUpClients} clients need follow-up (Measured)`,
          metrics.attention.followUpValue > 0
            ? `Historical CRM value associated: $${metrics.attention.followUpValue.toLocaleString()} (Historical — not predicted recovery)`
            : "More financial data required for recovery projection",
        ],
        actions: [
          { id: "crm", label: "Open CRM", type: "navigate", href: "/admin/crm" },
          { id: "marketing", label: "Re-engagement campaign", type: "navigate", href: "/admin/marketing?task=follow_up" },
        ],
      })
    );
  }

  if (metrics.traffic.conversionRate < 2.5 && metrics.traffic.visitors30 > 30) {
    leaks.push(
      leak({
        title: "Conversion soft relative to common studio ranges",
        reason: `Site converts at ${metrics.traffic.conversionRate}% (Measured). Gap-to-benchmark dollars are not computed — external benchmarks are unverified for this studio.`,
        category: "booking_flow",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.5,
        formula: "Dollar gap intentionally omitted — More financial data / verified benchmark required",
        evidence: [
          `${metrics.traffic.visitors30} visitors (30d) (Measured)`,
          `${metrics.traffic.conversionRate}% conversion (Measured)`,
          `Top page: ${metrics.traffic.topPage}`,
          "Industry Best Practice: some studios cite ~2.5–4% — not verified for ÉLEVÉ; not used as $ math",
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
        reason: "Platform intelligence scan detected SEO, UX, or content gaps that may reduce qualified inquiries",
        category: "seo",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.55,
        formula: "No $ projection from health score alone",
        evidence: [
          `Health score: ${healthValue.overallHealthScore}/100 (AI Analysis / scan)`,
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
          reason: `${topPage.path} drives ${topPage.views} views (Measured) but may lack strong booking CTA`,
          category: "cta",
          estimatedLoss: 0,
          recoveryPotential: 0,
          confidence: 0.55,
          formula: "Dollar leakage omitted — More financial data required",
          evidence: [`${topPage.views} views on ${topPage.path} (Measured)`, "No /book in top pages"],
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
        title: `${metrics.attention.galleriesAwaiting} booked projects idle 14+ days`,
        reason: "Delayed delivery may risk satisfaction and referrals — $ impact unknown",
        category: "retention",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.65,
        formula: "No $ projection without verified referral/satisfaction data",
        evidence: [`${metrics.attention.galleriesAwaiting} idle booked projects (Measured)`],
        actions: [
          { id: "submissions", label: "View bookings", type: "navigate", href: "/admin/submissions?type=booking" },
        ],
      })
    );
  }

  return leaks.sort((a, b) => b.confidence - a.confidence || b.recoveryPotential - a.recoveryPotential);
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

export function totalLeakExposure(leaks: RevenueLeak[]): {
  loss: number;
  recoverable: number;
  truthKind: "AI Prediction";
  disclaimer: string;
  financialDataSufficient: boolean;
} {
  const loss = leaks.reduce((s, l) => s + l.estimatedLoss, 0);
  const recoverable = leaks.reduce((s, l) => s + l.recoveryPotential * l.confidence, 0);
  return {
    loss,
    recoverable,
    truthKind: "AI Prediction",
    financialDataSufficient: false,
    disclaimer:
      loss > 0 || recoverable > 0
        ? "AI Prediction only — heuristic coefficients, not audited recoverable revenue. Do not cite as fact."
        : "More financial data required — exposure shown as qualitative risks without invented dollars.",
  };
}
