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
      value: Math.max(1, Math.round(r.estimatedRevenue / 1500)),
      quality: "estimated",
      updatedAt: new Date().toISOString(),
      confidence: r.confidence * 0.85,
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
    metrics.month.bookings > 0
      ? Math.round(metrics.revenue.thisMonth / metrics.month.bookings)
      : 1500;

  if (!top) {
    return {
      id: "mission-default",
      title: "Review stale booking inquiries and send follow-ups",
      reasoning:
        "When no ranked opportunity exists, the highest-ROI default is recovering pipeline that already exists.",
      expectedRevenue: qualifyMetric({
        value: metrics.attention.followUpValue || avgValue,
        quality: metrics.attention.followUpValue > 0 ? "calculated" : "estimated",
        updatedAt: metrics.generatedAt,
        confidence: 0.7,
        source: "CRM + submissions",
      }),
      expectedBookings: qualifyMetric({
        value: Math.max(1, metrics.attention.abandonedInquiries),
        quality: "calculated",
        updatedAt: metrics.generatedAt,
        source: "Submissions",
      }),
      timeMinutes: 25,
      difficulty: "easy",
      confidence: 0.7,
      evidence: ["Default executive playbook when pipeline data is thin"],
      successMetric: "At least 1 inquiry responded to within 24h",
      href: "/admin/submissions?type=booking",
      actions: [
        { id: "submissions", label: "Open inquiries", type: "navigate", href: "/admin/submissions?type=booking" },
      ],
      completed: false,
    };
  }

  const bookingImpact = Math.max(
    1,
    Math.round(top.estimatedRevenue / Math.max(avgValue, 1))
  );

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
      quality: "estimated",
      updatedAt: new Date().toISOString(),
      confidence: top.confidence * 0.9,
      source: `APV ~$${avgValue.toLocaleString()}`,
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

export async function buildTodaysMissions(): Promise<ExecutiveMission[]> {
  const [one, recs] = await Promise.all([buildTheOneThing(), getGuardedRecommendations(4)]);
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
}): Promise<{ ok: boolean; lesson: string }> {
  const { recordRecommendationFeedback } = await import("./self-improvement");
  const lesson = await recordRecommendationFeedback({
    recommendationId: input.missionId,
    title: input.title,
    worked: input.worked,
    detail:
      input.notes ??
      (input.worked
        ? `Mission completed — revenue impact ~$${input.revenueImpact ?? 0}, bookings +${input.bookingsImpact ?? 0}`
        : "Mission completed without measurable lift — confidence reduced for similar recommendations"),
    revenueImpact: input.revenueImpact,
  });

  const { writeMemory } = await import("../memory/store");
  await writeMemory({
    layer: "business",
    category: "mission_outcome",
    key: `${input.missionId}-${Date.now()}`,
    title: `Mission: ${input.title}`,
    summary: lesson.lesson,
    value: {
      missionId: input.missionId,
      worked: input.worked,
      revenueImpact: input.revenueImpact,
      bookingsImpact: input.bookingsImpact,
      notes: input.notes,
    },
    confidence: input.worked ? 0.9 : 0.4,
    importance: 85,
    source: "user",
    sourceRef: input.missionId,
    verified: true,
    tags: ["mission", "executive-os", input.worked ? "success" : "failure"],
    actor: "mission-control",
    reason: "Mission completion tracked for learning loop",
  });

  return { ok: true, lesson: lesson.lesson };
}
