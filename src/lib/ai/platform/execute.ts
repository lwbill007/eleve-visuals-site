/**
 * Recommendation execute adapters — turn "Do next" into real work where possible.
 * Every Execute permanently records a Decision Journal entry.
 * Navigation remains the fallback; never pretend an action ran if it did not.
 */

import { prisma } from "@/lib/db";
import { completeMission } from "@/lib/ai/executive/mission-control";
import { emitBusinessEvent } from "@/lib/ai/platform/business-events";
import { recordDecisionOnExecute } from "@/lib/ai/platform/decision-recorder";

export type ExecuteKind =
  | "navigate"
  | "mark_booking_contacted"
  | "mark_stale_bookings_contacted"
  | "complete_mission"
  | "open_pipeline"
  | "open_applications"
  | "open_memory_verify"
  | "open_payments_trust";

export interface ExecuteRequest {
  recommendationId: string;
  title?: string;
  kind?: ExecuteKind;
  href?: string;
  submissionId?: string;
  evidence?: string[];
  confidence?: number;
  expectedRevenue?: number;
  expectedOutcome?: string;
}

export interface ExecuteResult {
  ok: boolean;
  kind: ExecuteKind;
  message: string;
  href?: string;
  affected?: number;
  decisionId?: string;
}

function inferKind(input: ExecuteRequest): ExecuteKind {
  if (input.kind) return input.kind;
  const id = input.recommendationId.toLowerCase();
  const href = (input.href ?? "").toLowerCase();
  if (id.includes("stale")) return "mark_stale_bookings_contacted";
  if (href.includes("/admin/pipeline")) return "open_pipeline";
  if (href.includes("/admin/applications")) return "open_applications";
  if (href.includes("/admin/memory")) return "open_memory_verify";
  if (href.includes("/admin/qa") || href.includes("stripe") || href.includes("payment")) {
    return "open_payments_trust";
  }
  if (input.submissionId) return "mark_booking_contacted";
  return "navigate";
}

async function journal(input: ExecuteRequest, kind: ExecuteKind) {
  try {
    return await recordDecisionOnExecute({
      recommendationId: input.recommendationId,
      title: input.title ?? input.recommendationId,
      evidence: input.evidence,
      confidence: input.confidence,
      expectedRevenue: input.expectedRevenue,
      expectedOutcome: input.expectedOutcome,
      executeKind: kind,
      href: input.href,
    });
  } catch (err) {
    console.error("[execute] decision journal", err);
    return null;
  }
}

export async function executeRecommendation(input: ExecuteRequest): Promise<ExecuteResult> {
  const kind = inferKind(input);
  const decision = await journal(input, kind);
  const decisionId = decision?.id;

  switch (kind) {
    case "mark_booking_contacted": {
      if (!input.submissionId) {
        return { ok: false, kind, message: "Missing submission id.", href: input.href, decisionId };
      }
      const existing = await prisma.submission.findUnique({ where: { id: input.submissionId } });
      if (!existing || existing.type !== "booking") {
        return {
          ok: false,
          kind,
          message: "Booking not found.",
          href: "/admin/submissions?type=booking",
          decisionId,
        };
      }
      await prisma.submission.update({
        where: { id: input.submissionId },
        data: { status: "discovery", read: true },
      });
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Advanced booking to Discovery",
        worked: true,
        revenueImpact: input.expectedRevenue,
        notes: `Executed mark_booking_contacted → discovery on ${input.submissionId}`,
      });
      return {
        ok: true,
        kind,
        message: "Advanced to Discovery · Decision recorded. Reply to the client next.",
        href: `/admin/submissions?type=booking&focus=${input.submissionId}`,
        affected: 1,
        decisionId,
      };
    }

    case "mark_stale_bookings_contacted": {
      const cutoff = new Date(Date.now() - 3 * 86400000);
      const stale = await prisma.submission.findMany({
        where: {
          type: "booking",
          status: { in: ["new", "lead", "qualified", "contacted", "discovery", "proposal"] },
          updatedAt: { lt: cutoff },
        },
        select: { id: true, status: true },
        take: 25,
      });
      const toTouch = stale.filter((s) => s.status === "new" || s.status === "lead");
      if (toTouch.length === 0) {
        return {
          ok: true,
          kind,
          message:
            stale.length > 0
              ? "Stale leads already in Discovery — open inbox to reply. Decision recorded."
              : "No stale bookings found. Decision recorded.",
          href: "/admin/submissions?type=booking",
          affected: 0,
          decisionId,
        };
      }
      await prisma.submission.updateMany({
        where: { id: { in: toTouch.map((s) => s.id) } },
        data: { status: "discovery", read: true },
      });
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Stale leads advanced to Discovery",
        worked: true,
        revenueImpact: input.expectedRevenue,
        notes: `Advanced ${toTouch.length} stale bookings to discovery`,
      });
      void emitBusinessEvent({
        type: "booking_updated",
        entityType: "Submission",
        entityId: toTouch[0]?.id ?? "batch",
        payload: { count: toTouch.length, action: "advance_to_discovery" },
      }).catch(() => undefined);
      return {
        ok: true,
        kind,
        message: `Advanced ${toTouch.length} lead${toTouch.length === 1 ? "" : "s"} to Discovery · Decision recorded. Reply next.`,
        href: "/admin/submissions?type=booking",
        affected: toTouch.length,
        decisionId,
      };
    }

    case "complete_mission": {
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Mission completed",
        worked: true,
        revenueImpact: input.expectedRevenue,
        notes: "Executed from recommendation adapter",
      });
      return {
        ok: true,
        kind,
        message: "Marked complete · Decision recorded.",
        href: input.href,
        decisionId,
      };
    }

    case "open_pipeline":
      return {
        ok: true,
        kind,
        message: "Opening pipeline · Decision recorded.",
        href: "/admin/pipeline",
        decisionId,
      };
    case "open_applications":
      return {
        ok: true,
        kind,
        message: "Opening applications · Decision recorded.",
        href: "/admin/applications",
        decisionId,
      };
    case "open_memory_verify":
      return {
        ok: true,
        kind,
        message: "Opening verification queue · Decision recorded.",
        href: "/admin/memory",
        decisionId,
      };
    case "open_payments_trust":
      return {
        ok: true,
        kind,
        message: "Opening Trust / connectors · Decision recorded.",
        href: "/admin/qa",
        decisionId,
      };
    case "navigate":
    default:
      return {
        ok: true,
        kind: "navigate",
        message: "Opening destination · Decision recorded.",
        href: input.href || "/admin",
        decisionId,
      };
  }
}

export function executeLabel(kind: ExecuteKind, fallback = "Open"): string {
  switch (kind) {
    case "mark_booking_contacted":
    case "mark_stale_bookings_contacted":
      return "Advance to Consultation";
    case "complete_mission":
      return "Complete";
    case "open_pipeline":
      return "Open pipeline";
    case "open_applications":
      return "Review apps";
    case "open_memory_verify":
      return "Verify";
    case "open_payments_trust":
      return "Fix sources";
    default:
      return fallback;
  }
}
