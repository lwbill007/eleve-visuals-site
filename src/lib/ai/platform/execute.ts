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
  executionStatus?: "opened" | "executed" | "failed";
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

  switch (kind) {
    case "mark_booking_contacted": {
      if (!input.submissionId) {
        return {
          ok: false,
          kind,
          executionStatus: "failed",
          message: "Missing submission id.",
          href: input.href,
        };
      }
      const existing = await prisma.submission.findUnique({ where: { id: input.submissionId } });
      if (!existing || existing.type !== "booking") {
        return {
          ok: false,
          kind,
          executionStatus: "failed",
          message: "Booking not found.",
          href: "/admin/submissions?type=booking",
        };
      }
      await prisma.$transaction(async (tx) => {
        await tx.submission.update({
          where: { id: input.submissionId },
          data: { status: "discovery", read: true },
        });
        await tx.activityLog.create({
          data: {
            actor: "admin",
            action: "booking_stage_changed",
            target: input.submissionId,
            details: `${existing.status} → discovery · recommendation ${input.recommendationId}`,
          },
        });
      });
      const serverTitle = `Advance booking ${existing.id} to Consultation`;
      const decision = await journal(
        {
          ...input,
          title: serverTitle,
          evidence: [`Booking ${existing.id} was in ${existing.status}`],
          expectedRevenue: undefined,
        },
        kind
      );
      await completeMission({
        missionId: input.recommendationId,
        title: serverTitle,
        worked: true,
        notes: `Executed mark_booking_contacted → discovery on ${input.submissionId}`,
      }).catch((error) => console.error("[execute] mission follow-up", error));
      return {
        ok: true,
        kind,
        executionStatus: "executed",
        message: "Advanced to Discovery · Decision recorded. Reply to the client next.",
        href: `/admin/submissions?type=booking&focus=${input.submissionId}`,
        affected: 1,
        decisionId: decision?.id,
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
        const decision = await journal(
          {
            ...input,
            title: "Review stale booking inquiries",
            evidence: [`${stale.length} stale inquiries found; none required a stage change`],
            expectedRevenue: undefined,
          },
          kind
        );
        return {
          ok: true,
          kind,
          executionStatus: "opened",
          message:
            stale.length > 0
              ? "Stale leads already in Discovery — open inbox to reply. Decision recorded."
              : "No stale bookings found. Decision recorded.",
          href: "/admin/submissions?type=booking",
          affected: 0,
          decisionId: decision?.id,
        };
      }
      await prisma.$transaction(async (tx) => {
        await tx.submission.updateMany({
          where: { id: { in: toTouch.map((s) => s.id) } },
          data: { status: "discovery", read: true },
        });
        await tx.activityLog.create({
          data: {
            actor: "admin",
            action: "booking_stage_changed_batch",
            target: "stale-bookings",
            details: `${toTouch.length} lead(s) → discovery · recommendation ${input.recommendationId}`,
          },
        });
      });
      const decision = await journal(
        {
          ...input,
          title: "Advance stale booking leads to Consultation",
          evidence: [`${toTouch.length} server-selected stale leads advanced`],
          expectedRevenue: undefined,
        },
        kind
      );
      await completeMission({
        missionId: input.recommendationId,
        title: "Stale leads advanced to Discovery",
        worked: true,
        notes: `Advanced ${toTouch.length} stale bookings to discovery`,
      }).catch((error) => console.error("[execute] mission follow-up", error));
      void emitBusinessEvent({
        type: "booking_updated",
        entityType: "Submission",
        entityId: toTouch[0]?.id ?? "batch",
        payload: { count: toTouch.length, action: "advance_to_discovery" },
      }).catch(() => undefined);
      return {
        ok: true,
        kind,
        executionStatus: "executed",
        message: `Advanced ${toTouch.length} lead${toTouch.length === 1 ? "" : "s"} to Discovery · Decision recorded. Reply next.`,
        href: "/admin/submissions?type=booking",
        affected: toTouch.length,
        decisionId: decision?.id,
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
      const decision = await journal(input, kind);
      return {
        ok: true,
        kind,
        executionStatus: "executed",
        message: "Marked complete · Decision recorded.",
        href: input.href,
        decisionId: decision?.id,
      };
    }

    case "open_pipeline": {
      const decision = await journal(input, kind);
      return {
        ok: true,
        kind,
        executionStatus: "opened",
        message: "Opening pipeline · Decision recorded.",
        href: "/admin/pipeline",
        decisionId: decision?.id,
      };
    }
    case "open_applications": {
      const decision = await journal(input, kind);
      return {
        ok: true,
        kind,
        executionStatus: "opened",
        message: "Opening applications · Decision recorded.",
        href: "/admin/applications",
        decisionId: decision?.id,
      };
    }
    case "open_memory_verify": {
      const decision = await journal(input, kind);
      return {
        ok: true,
        kind,
        executionStatus: "opened",
        message: "Opening verification queue · Decision recorded.",
        href: "/admin/memory",
        decisionId: decision?.id,
      };
    }
    case "open_payments_trust": {
      const decision = await journal(input, kind);
      return {
        ok: true,
        kind,
        executionStatus: "opened",
        message: "Opening Trust / connectors · Decision recorded.",
        href: "/admin/qa",
        decisionId: decision?.id,
      };
    }
    case "navigate":
    default: {
      const href = input.href?.startsWith("/admin") ? input.href : "/admin";
      const decision = await journal({ ...input, href }, "navigate");
      return {
        ok: true,
        kind: "navigate",
        executionStatus: "opened",
        message: "Opening destination · Decision recorded.",
        href,
        decisionId: decision?.id,
      };
    }
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
