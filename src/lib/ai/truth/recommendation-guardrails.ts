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

/** Only when there are real stale booking inquiries — never invent a count of 1. */
function staleInquiryRecoveryRec(
  metrics: Awaited<ReturnType<typeof getOperatorMetrics>>
): GuardedRecommendation {
  const stale = metrics.attention.abandonedInquiries;
  const value = metrics.attention.followUpValue > 0 ? metrics.attention.followUpValue : 0;

  return finalizeGuarded(
    {
      id: "guardrail-stale-inquiries",
      title: `Respond to ${stale} stale booking inquir${stale === 1 ? "y" : "ies"} today`,
      detail:
        "Measured stale inquiries (3+ days without response). Sales recovery outranks SEO/content until the queue is cleared.",
      category: "sales",
      estimatedRevenue: value,
      confidence: 0.88,
      timeToCompleteMinutes: 25,
      difficulty: "easy",
      priority: "critical",
      whyNow: `Revenue MTD: $${metrics.revenue.thisMonth.toLocaleString()} · ${stale} stale inquiries (Measured) · guardrail: sales before SEO`,
      evidence: [
        `Truth metric attention.abandonedInquiries = ${stale} (Measured)`,
        value > 0
          ? `Follow-up value basis ~$${value.toLocaleString()} (Estimated)`
          : "Dollar impact Unknown — no follow-up value basis",
        "Source: Submission table · booking status in early stages · updatedAt > 3 days",
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

/** CRM inactive clients — distinct from booking inquiry queue. */
function crmFollowUpRec(
  metrics: Awaited<ReturnType<typeof getOperatorMetrics>>
): GuardedRecommendation {
  const followUp = metrics.attention.followUpClients;
  const value = metrics.attention.followUpValue > 0 ? metrics.attention.followUpValue : 0;

  return finalizeGuarded(
    {
      id: "guardrail-crm-follow-up",
      title: `Re-engage ${followUp} inactive client${followUp === 1 ? "" : "s"}`,
      detail:
        "Measured CRM inactivity (60+ days). Not the same as pending booking inquiries — no invented inquiry count.",
      category: "sales",
      estimatedRevenue: value,
      confidence: 0.72,
      timeToCompleteMinutes: 30,
      difficulty: "easy",
      priority: "high",
      whyNow: `${followUp} inactive CRM contacts (Measured) · Revenue MTD $${metrics.revenue.thisMonth.toLocaleString()}`,
      evidence: [
        `Truth metric attention.followUpClients = ${followUp} (Measured)`,
        value > 0
          ? `Associated historical value ~$${value.toLocaleString()} (Estimated — not recovery prediction)`
          : "Dollar impact Unknown — no follow-up value basis",
      ],
      actions: [
        {
          id: "crm",
          label: "Open CRM",
          type: "navigate",
          href: "/admin/crm",
        },
      ],
    },
    { supportingGraphPaths: ["CRM → Follow-up → Booking"] }
  );
}

function deprioritizeVanity(
  rec: PrioritizedRecommendation,
  salesGuardActive: boolean
): GuardedRecommendation {
  const isSeoOrContent =
    salesGuardActive &&
    rec.category === "marketing" &&
    (rec.title.toLowerCase().includes("seo") ||
      rec.title.toLowerCase().includes("meta") ||
      rec.title.toLowerCase().includes("content"));

  return finalizeGuarded({
    ...rec,
    deprioritized: isSeoOrContent,
    deprioritizeReason: isSeoOrContent
      ? "Deprioritized: clear measured sales queue before SEO/content (guardrail)"
      : undefined,
  });
}

export async function getGuardedRecommendations(limit = 12): Promise<GuardedRecommendation[]> {
  const [metrics, base] = await Promise.all([getOperatorMetrics(), basePrioritize(limit + 5)]);

  const stale = metrics.attention.abandonedInquiries;
  const followUp = metrics.attention.followUpClients;

  // Only real queues — never invent pending inquiries when the studio is empty.
  const hasStaleInquiries = stale > 0;
  const hasCrmFollowUps = followUp > 0;
  const salesGuardActive = hasStaleInquiries;

  const bookingsDeclining =
    metrics.month.bookings > 0 && metrics.month.bookingsChange < -10;

  let recs: GuardedRecommendation[] = base.map((r) => deprioritizeVanity(r, salesGuardActive));

  if (hasStaleInquiries) {
    const sales = staleInquiryRecoveryRec(metrics);
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
              (r.category === "marketing" ? "Clear stale booking inquiries first" : undefined),
            priority: r.priority === "critical" ? "medium" : r.priority,
          })
        ),
    ];
  } else if (hasCrmFollowUps && metrics.revenue.thisMonth === 0) {
    // Soft CRM nudge only — do not claim "pending booking inquiries"
    recs = [crmFollowUpRec(metrics), ...recs.filter((r) => r.id !== "guardrail-crm-follow-up")];
  }

  if (bookingsDeclining && !hasStaleInquiries) {
    recs.unshift(
      finalizeGuarded({
        id: "guardrail-booking-decline",
        title: "Analyze booking decline — check follow-up speed and form friction",
        detail: `Bookings changed ${metrics.month.bookingsChange}% MTD (${metrics.month.bookings} this month, Measured). Diagnose before new campaigns.`,
        category: "sales",
        estimatedRevenue: 0,
        confidence: 0.7,
        timeToCompleteMinutes: 40,
        difficulty: "moderate",
        priority: "high",
        whyNow: `Bookings ${metrics.month.bookingsChange}% MTD — measured decline, not invented queue`,
        evidence: [
          `month.bookings = ${metrics.month.bookings} (Measured)`,
          `month.bookingsChange = ${metrics.month.bookingsChange}% (Measured)`,
        ],
        actions: [
          {
            id: "submissions",
            label: "Open bookings",
            type: "navigate",
            href: "/admin/submissions?type=booking",
          },
          {
            id: "analytics",
            label: "Open Analytics",
            type: "navigate",
            href: "/admin/analytics",
          },
        ],
      })
    );
  }

  return recs
    .filter((r) => isHonestInquiryRecommendation(r, stale))
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

/** Drop titles that invent booking-inquiry work when the measured queue is empty. */
function isHonestInquiryRecommendation(rec: PrioritizedRecommendation, stale: number): boolean {
  const title = rec.title.toLowerCase();
  const claimsInquiryWork =
    /pending booking|stale booking inquir|abandoned booking inquir|respond to \d+/.test(title) &&
    /inquir/.test(title);
  if (claimsInquiryWork && stale <= 0) return false;
  // Contradictory copy: "Respond to N…" while why admits 0 stale
  if (/respond to \d+/.test(title) && /0 stale inquir/.test(rec.whyNow.toLowerCase())) return false;
  return true;
}
