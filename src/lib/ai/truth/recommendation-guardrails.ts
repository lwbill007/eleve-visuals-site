import { getOperatorMetrics } from "../intelligence/business-operator";
import { getPrioritizedRecommendations as basePrioritize } from "../intelligence/executive-prioritization";
import { buildExecutiveConfidence } from "./confidence-engine";
import { buildExecutiveRecommendation, type ExecutiveRecommendation } from "../platform/recommendation-contract";
import type { PrioritizedRecommendation } from "../types";
import type { ExecutiveConfidence } from "./types";

export interface GuardedRecommendation extends PrioritizedRecommendation {
  confidenceDetail: ExecutiveConfidence;
  executiveRecommendation: ExecutiveRecommendation;
  deprioritized?: boolean;
  deprioritizeReason?: string;
}

function finalizeGuarded(
  rec: PrioritizedRecommendation & { deprioritized?: boolean; deprioritizeReason?: string },
  extra?: { supportingGraphPaths?: string[] }
): GuardedRecommendation {
  const confidenceDetail = buildExecutiveConfidence(rec);
  return {
    ...rec,
    confidenceDetail,
    executiveRecommendation: buildExecutiveRecommendation(
      { ...rec, confidenceDetail },
      { supportingGraphPaths: extra?.supportingGraphPaths, owner: "Studio owner" }
    ),
  };
}

function salesRecoveryRec(metrics: Awaited<ReturnType<typeof getOperatorMetrics>>): GuardedRecommendation {
  const stale = metrics.attention.abandonedInquiries;
  const followUp = metrics.attention.followUpClients;
  const value = metrics.attention.followUpValue || 1500;

  return finalizeGuarded(
    {
      id: "guardrail-sales-recovery",
      title: `Respond to ${stale || followUp || 1} pending booking ${stale === 1 ? "inquiry" : "inquiries"} today`,
      detail:
        "Revenue is $0 MTD with active pipeline. Sales recovery outranks SEO and content until inquiries are addressed.",
      category: "sales",
      estimatedRevenue: value,
      confidence: stale > 0 ? 0.82 : 0.65,
      timeToCompleteMinutes: 25,
      difficulty: "easy",
      priority: "critical",
      whyNow: `Revenue MTD: $${metrics.revenue.thisMonth.toLocaleString()} · ${stale} stale inquiries · guardrail: sales before SEO`,
      evidence: [
        `Pipeline follow-up value: ~$${value.toLocaleString()}`,
        `${followUp} clients need follow-up`,
        "Production readiness guardrail: revenue=0 + pending inquiries",
      ],
      actions: [
        {
          id: "submissions",
          label: "Open booking inquiries",
          type: "navigate",
          href: "/admin/submissions?type=booking",
        },
        {
          id: "crm",
          label: "Open CRM",
          type: "navigate",
          href: "/admin/crm",
        },
      ],
    },
    { supportingGraphPaths: ["Inquiry → Submission → CRM → Booking"] }
  );
}

function deprioritizeVanity(rec: PrioritizedRecommendation): GuardedRecommendation {
  const isSeoOrContent =
    rec.category === "marketing" &&
    (rec.title.toLowerCase().includes("seo") ||
      rec.title.toLowerCase().includes("meta") ||
      rec.title.toLowerCase().includes("content"));

  return finalizeGuarded({
    ...rec,
    deprioritized: isSeoOrContent,
    deprioritizeReason: isSeoOrContent
      ? "Deprioritized: sales recovery required before SEO/content (guardrail)"
      : undefined,
  });
}

export async function getGuardedRecommendations(limit = 12): Promise<GuardedRecommendation[]> {
  const [metrics, base] = await Promise.all([getOperatorMetrics(), basePrioritize(limit + 5)]);

  const needsSalesRecovery =
    metrics.revenue.thisMonth === 0 &&
    (metrics.attention.abandonedInquiries > 0 ||
      metrics.attention.followUpClients > 0 ||
      metrics.month.bookings === 0);

  const bookingsDeclining = metrics.month.bookingsChange < -10;

  let recs: GuardedRecommendation[] = base.map(deprioritizeVanity);

  if (needsSalesRecovery) {
    const sales = salesRecoveryRec(metrics);
    recs = [
      sales,
      ...recs
        .filter((r) => r.id !== sales.id)
        .map((r) =>
          finalizeGuarded({
            ...r,
            deprioritized: r.deprioritized || r.category === "marketing",
            deprioritizeReason:
              r.deprioritizeReason ??
              (r.category === "marketing" ? "Sales recovery takes priority" : undefined),
            priority: r.priority === "critical" ? "medium" : r.priority,
          })
        ),
    ];
  }

  if (bookingsDeclining && !needsSalesRecovery) {
    const followUp = salesRecoveryRec(metrics);
    followUp.title = "Analyze booking decline — check follow-up speed and form friction";
    followUp.whyNow = `Bookings ${metrics.month.bookingsChange}% MTD — diagnose CRM and funnel before new campaigns`;
    followUp.executiveRecommendation = buildExecutiveRecommendation(followUp, {
      supportingGraphPaths: ["Page → Form → Submission → Booking"],
    });
    recs.unshift(followUp);
  }

  return recs
    .sort((a, b) => {
      if (a.deprioritized && !b.deprioritized) return 1;
      if (!a.deprioritized && b.deprioritized) return -1;
      const pr: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (pr[a.priority] ?? 2) - (pr[b.priority] ?? 2) ||
        b.estimatedRevenue * b.confidence - a.estimatedRevenue * a.confidence
      );
    })
    .slice(0, limit);
}
