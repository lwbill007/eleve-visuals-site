import { getBookingIntelligence } from "../../intelligence/bookings";
import { getSalesRecommendations, getOperatorMetrics } from "../../intelligence/business-operator";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildCSOBrief(): Promise<ExecutiveRoleBrief> {
  const [bookingIntel, salesRecs, metrics] = await Promise.all([
    getBookingIntelligence(),
    getSalesRecommendations(),
    getOperatorMetrics(),
  ]);

  const salesScore = Math.min(100, Math.max(10, 100 - metrics.attention.abandonedInquiries * 4));

  return {
    id: "cso",
    title: ROLE_META.cso.title,
    mission: ROLE_META.cso.mission,
    healthScore: salesScore,
    confidence: 0.86,
    topPriority:
      bookingIntel.staleInquiries > 0
        ? `Close ${bookingIntel.staleInquiries} stale inquiries — $${bookingIntel.pipelineValue.toLocaleString()} pipeline`
        : `Forecast ${bookingIntel.monthBookings} bookings this month`,
    insights: [
      {
        text: `Pipeline value $${bookingIntel.pipelineValue.toLocaleString()}`,
        kind: "fact",
        evidence: ["Open pipeline stages"],
      },
      {
        text: `${bookingIntel.staleInquiries} inquiries untouched 3+ days`,
        kind: "fact",
      },
      {
        text: `Busy months historically: ${bookingIntel.busyMonths.join(", ") || "building data"}`,
        kind: "inference",
      },
      {
        text: `${bookingIntel.abandonedBookings.length} recoverable abandoned inquiries`,
        kind: "prediction",
        evidence: ["Recovery campaigns typically convert 15–30%"],
      },
    ],
    recommendations: salesRecs.slice(0, 3).map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      why: r.detail,
      kind: "suggestion" as const,
      confidence: r.impact === "high" ? 0.85 : 0.7,
      expectedImpact: r.impact,
      actions: r.actions,
    })),
    metrics: [
      { label: "Pipeline", value: `$${bookingIntel.pipelineValue.toLocaleString()}`, source: "Pipeline" },
      { label: "Stale", value: String(bookingIntel.staleInquiries), source: "Submissions" },
      { label: "Month bookings", value: String(bookingIntel.monthBookings), source: "Submissions" },
      {
        label: "Follow-up value",
        value: `$${metrics.attention.followUpValue.toLocaleString()}`,
        source: "CRM",
      },
    ],
    href: ROLE_META.cso.href,
  };
}
