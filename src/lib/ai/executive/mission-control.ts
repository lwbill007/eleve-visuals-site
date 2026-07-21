import { getGuardedRecommendations, type GuardedRecommendation } from "../truth/recommendation-guardrails";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { qualifyMetric } from "./data-quality";
import type { ExecutiveMission } from "./operating-system-types";

function missionFromRec(r: GuardedRecommendation): ExecutiveMission {
  return {
    id: `mission-${r.id}`,
    title: r.title,
    reasoning: r.whyNow,
    expectedRevenue: qualifyMetric({
      value: r.estimatedRevenue,
      quality: r.confidence > 0.8 ? "calculated" : "estimated",
      updatedAt: new Date().toISOString(),
      confidence: r.confidence,
      lowConfidenceReason:
        r.confidence < 0.65 ? "Limited historical outcome data for this action type" : undefined,
      source: r.evidence[0] ?? "Executive prioritization engine",
    }),
    expectedBookings: qualifyMetric({
      value: 0,
      quality: "unavailable",
      updatedAt: new Date().toISOString(),
      confidence: 0,
      lowConfidenceReason: "Booking-count impact Unknown — no measured avg booking value",
      source: "Not computed from invented ASP",
    }),
    timeMinutes: r.timeToCompleteMinutes,
    difficulty: r.difficulty,
    confidence: r.confidence,
    evidence: r.evidence,
    successMetric:
      r.category === "revenue" || r.category === "sales"
        ? "Inquiry response or booking moved forward within 48h"
        : "Measurable traffic or inquiry lift within 7 days",
    href: r.actions[0]?.href ?? "/admin/opportunities",
    actions: r.actions,
    completed: false,
    confidenceDetail: r.confidenceDetail,
    executiveRecommendation: r.executiveRecommendation,
    deprioritized: r.deprioritized,
    deprioritizeReason: r.deprioritizeReason,
  };
}

export async function buildTheOneThing(): Promise<ExecutiveMission> {
  const [recs, metrics] = await Promise.all([getGuardedRecommendations(3), getOperatorMetrics()]);

  const top = recs[0];
  const avgValue =
    metrics.month.bookings > 0 && metrics.revenue.thisMonth > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 0;
  const stale = metrics.attention.abandonedInquiries;

  if (!top) {
    // Empty / quiet studio — never invent "1 pending inquiry" or a $1500 ASP.
    if (stale === 0 && metrics.month.bookings === 0) {
      return {
        id: "mission-quiet-studio",
        title: "No booking pipeline yet — drive acquisition",
        reasoning:
          "Measured: 0 bookings MTD · 0 stale inquiries · $0 revenue. Nothing to recover; focus on getting the first real inquiry.",
        expectedRevenue: qualifyMetric({
          value: 0,
          quality: "verified",
          updatedAt: metrics.generatedAt,
          confidence: 0.9,
          source: "Operator metrics (empty pipeline)",
        }),
        expectedBookings: qualifyMetric({
          value: 0,
          quality: "verified",
          updatedAt: metrics.generatedAt,
          source: "Submissions",
        }),
        timeMinutes: 30,
        difficulty: "moderate",
        confidence: 0.85,
        evidence: [
          "month.bookings = 0 (Measured)",
          "attention.abandonedInquiries = 0 (Measured)",
          "revenue.thisMonth = $0 (Measured)",
        ],
        successMetric: "First booking inquiry received",
        href: "/admin/marketing",
        actions: [
          { id: "marketing", label: "Open Marketing", type: "navigate", href: "/admin/marketing" },
          { id: "analytics", label: "Open Analytics", type: "navigate", href: "/admin/analytics" },
        ],
        completed: false,
      };
    }

    return {
      id: "mission-default",
      title:
        stale > 0
          ? `Respond to ${stale} stale booking inquir${stale === 1 ? "y" : "ies"}`
          : "Review CRM and follow-up queue",
      reasoning:
        stale > 0
          ? `${stale} measured stale inquiries need response before new campaigns.`
          : "No ranked opportunity — review CRM activity without inventing inquiry counts.",
      expectedRevenue: qualifyMetric({
        value: metrics.attention.followUpValue,
        quality: metrics.attention.followUpValue > 0 ? "calculated" : "unavailable",
        updatedAt: metrics.generatedAt,
        confidence: 0.7,
        source: "CRM + submissions",
      }),
      expectedBookings: qualifyMetric({
        value: stale,
        quality: "verified",
        updatedAt: metrics.generatedAt,
        source: "Submissions",
      }),
      timeMinutes: 25,
      difficulty: "easy",
      confidence: 0.7,
      evidence: [
        `attention.abandonedInquiries = ${stale} (Measured)`,
        `attention.followUpClients = ${metrics.attention.followUpClients} (Measured)`,
      ],
      successMetric:
        stale > 0 ? "Stale inquiry responded to within 24h" : "CRM follow-up logged",
      href: stale > 0 ? "/admin/submissions?type=booking" : "/admin/crm",
      actions: [
        {
          id: stale > 0 ? "submissions" : "crm",
          label: stale > 0 ? "Open inquiries" : "Open CRM",
          type: "navigate",
          href: stale > 0 ? "/admin/submissions?type=booking" : "/admin/crm",
        },
      ],
      completed: false,
    };
  }

  const bookingImpact =
    avgValue > 0 && top.estimatedRevenue > 0
      ? Math.max(0, Math.round(top.estimatedRevenue / avgValue))
      : 0;

  return {
    id: `mission-${top.id}`,
    title: top.title,
    reasoning: top.whyNow,
    expectedRevenue: qualifyMetric({
      value: top.estimatedRevenue,
      quality: top.confidence > 0.8 ? "calculated" : "estimated",
      updatedAt: new Date().toISOString(),
      confidence: top.confidence,
      lowConfidenceReason: top.confidence < 0.65 ? "Limited historical outcome data for this action type" : undefined,
      source: top.evidence[0] ?? "Executive prioritization engine",
    }),
    expectedBookings: qualifyMetric({
      value: bookingImpact,
      quality: bookingImpact > 0 ? "estimated" : "unavailable",
      updatedAt: new Date().toISOString(),
      confidence: bookingImpact > 0 ? top.confidence * 0.9 : 0,
      lowConfidenceReason:
        bookingImpact > 0 ? undefined : "Booking-count impact Unknown — no measured avg booking value",
      source: avgValue > 0 ? `APV ~$${avgValue.toLocaleString()}` : "Not computed from invented ASP",
    }),
    timeMinutes: top.timeToCompleteMinutes,
    difficulty: top.difficulty,
    confidence: top.confidence,
    evidence: top.evidence,
    successMetric:
      top.category === "revenue" || top.category === "sales"
        ? "Inquiry response or booking moved forward within 48h"
        : "Measurable traffic or inquiry lift within 7 days",
    href: top.actions[0]?.href ?? "/admin/opportunities",
    actions: top.actions,
    completed: false,
    confidenceDetail: top.confidenceDetail,
    deprioritized: top.deprioritized,
    deprioritizeReason: top.deprioritizeReason,
  };
}

export async function buildTodaysMissions(
  oneThing?: ExecutiveMission
): Promise<ExecutiveMission[]> {
  const [one, recs] = await Promise.all([
    oneThing ? Promise.resolve(oneThing) : buildTheOneThing(),
    getGuardedRecommendations(4),
  ]);
  const rest = recs.slice(1).map(missionFromRec);
  return [one, ...rest];
}

export async function completeMission(input: {
  missionId: string;
  title: string;
  worked: boolean;
  revenueImpact?: number;
  bookingsImpact?: number;
  notes?: string;
  expectedRevenue?: number;
}): Promise<{ ok: boolean; lesson: string; accuracy?: number }> {
  const { recordRecommendationFeedback } = await import("./self-improvement");
  const { recordDecisionOutcome } = await import("../platform/decision-recorder");

  const lesson = await recordRecommendationFeedback({
    recommendationId: input.missionId,
    title: input.title,
    worked: input.worked,
    detail:
      input.notes ??
      (input.worked
        ? input.revenueImpact != null || input.bookingsImpact != null
          ? `Mission completed — reported revenue impact ${input.revenueImpact != null ? `$${input.revenueImpact}` : "not provided"}, bookings ${input.bookingsImpact != null ? `+${input.bookingsImpact}` : "not provided"}`
          : "Mission completed; outcome metrics were not provided."
        : "Mission completed without measurable lift — confidence reduced for similar recommendations"),
    revenueImpact: input.revenueImpact,
  });

  const outcome = await recordDecisionOutcome({
    recommendationId: input.missionId,
    title: input.title,
    worked: input.worked,
    actualRevenue: input.revenueImpact,
    expectedRevenue: input.expectedRevenue ?? input.revenueImpact,
    notes: input.notes,
  });

  const { writeMemory } = await import("../memory/store");
  await writeMemory({
    layer: "business",
    category: "mission_outcome",
    key: `${input.missionId}-${Date.now()}`,
    title: `Mission: ${input.title}`,
    summary: outcome.lesson || lesson.lesson,
    value: {
      missionId: input.missionId,
      worked: input.worked,
      revenueImpact: input.revenueImpact,
      bookingsImpact: input.bookingsImpact,
      notes: input.notes,
      accuracy: outcome.accuracy,
    },
    confidence: outcome.accuracy ?? 0,
    importance: 85,
    source: "user",
    sourceRef: input.missionId,
    verified: false,
    tags: [
      "mission",
      "executive-os",
      "operator-reported",
      input.worked ? "success" : "failure",
      "learning",
    ],
    actor: "mission-control",
    reason: "Operator-reported mission completion; independent outcome verification is pending",
  });

  return {
    ok: true,
    lesson: outcome.lesson || lesson.lesson,
    accuracy: outcome.accuracy ?? undefined,
  };
}
