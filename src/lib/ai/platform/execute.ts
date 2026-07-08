/**
 * Recommendation execute adapters — turn "Do next" into real work where possible.
 * Navigation remains the fallback; never pretend an action ran if it did not.
 */

import { prisma } from "@/lib/db";
import { completeMission } from "@/lib/ai/executive/mission-control";
import { emitBusinessEvent } from "@/lib/ai/platform/business-events";

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
}

export interface ExecuteResult {
  ok: boolean;
  kind: ExecuteKind;
  message: string;
  href?: string;
  affected?: number;
}

function inferKind(input: ExecuteRequest): ExecuteKind {
  if (input.kind) return input.kind;
  const id = input.recommendationId.toLowerCase();
  const href = (input.href ?? "").toLowerCase();
  if (id.includes("stale") || href.includes("type=booking")) return "mark_stale_bookings_contacted";
  if (href.includes("/admin/pipeline")) return "open_pipeline";
  if (href.includes("/admin/applications")) return "open_applications";
  if (href.includes("/admin/memory")) return "open_memory_verify";
  if (href.includes("/admin/qa") || href.includes("stripe") || href.includes("payment")) {
    return "open_payments_trust";
  }
  if (input.submissionId) return "mark_booking_contacted";
  return "navigate";
}

export async function executeRecommendation(input: ExecuteRequest): Promise<ExecuteResult> {
  const kind = inferKind(input);

  switch (kind) {
    case "mark_booking_contacted": {
      if (!input.submissionId) {
        return { ok: false, kind, message: "Missing submission id.", href: input.href };
      }
      const existing = await prisma.submission.findUnique({ where: { id: input.submissionId } });
      if (!existing || existing.type !== "booking") {
        return { ok: false, kind, message: "Booking not found.", href: "/admin/submissions?type=booking" };
      }
      await prisma.submission.update({
        where: { id: input.submissionId },
        data: { status: "contacted", read: true },
      });
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Marked booking contacted",
        worked: true,
        notes: `Executed mark_booking_contacted on ${input.submissionId}`,
      });
      return {
        ok: true,
        kind,
        message: "Marked contacted.",
        href: `/admin/submissions?type=booking&focus=${input.submissionId}`,
        affected: 1,
      };
    }

    case "mark_stale_bookings_contacted": {
      const cutoff = new Date(Date.now() - 3 * 86400000);
      const stale = await prisma.submission.findMany({
        where: {
          type: "booking",
          status: { in: ["new", "contacted"] },
          updatedAt: { lt: cutoff },
        },
        select: { id: true, status: true },
        take: 25,
      });
      const toTouch = stale.filter((s) => s.status === "new");
      if (toTouch.length === 0) {
        return {
          ok: true,
          kind,
          message:
            stale.length > 0
              ? "Stale bookings already contacted — open inbox to reply."
              : "No stale bookings found.",
          href: "/admin/submissions?type=booking",
          affected: 0,
        };
      }
      await prisma.submission.updateMany({
        where: { id: { in: toTouch.map((s) => s.id) } },
        data: { status: "contacted", read: true },
      });
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Stale bookings marked contacted",
        worked: true,
        notes: `Marked ${toTouch.length} stale bookings contacted`,
      });
      void emitBusinessEvent({
        type: "booking_updated",
        entityType: "Submission",
        entityId: toTouch[0]?.id ?? "batch",
        payload: { count: toTouch.length, action: "mark_stale_contacted" },
      }).catch(() => undefined);
      return {
        ok: true,
        kind,
        message: `Marked ${toTouch.length} stale booking${toTouch.length === 1 ? "" : "s"} contacted. Reply next.`,
        href: "/admin/submissions?type=booking",
        affected: toTouch.length,
      };
    }

    case "complete_mission": {
      await completeMission({
        missionId: input.recommendationId,
        title: input.title ?? "Mission completed",
        worked: true,
        notes: "Executed from recommendation adapter",
      });
      return { ok: true, kind, message: "Marked complete.", href: input.href };
    }

    case "open_pipeline":
      return { ok: true, kind, message: "Opening pipeline.", href: "/admin/pipeline" };
    case "open_applications":
      return { ok: true, kind, message: "Opening applications.", href: "/admin/applications" };
    case "open_memory_verify":
      return { ok: true, kind, message: "Opening verification queue.", href: "/admin/memory" };
    case "open_payments_trust":
      return { ok: true, kind, message: "Opening Trust / connectors.", href: "/admin/qa" };
    case "navigate":
    default:
      return {
        ok: true,
        kind: "navigate",
        message: "Opening destination.",
        href: input.href || "/admin",
      };
  }
}

export function executeLabel(kind: ExecuteKind, fallback = "Open"): string {
  switch (kind) {
    case "mark_booking_contacted":
    case "mark_stale_bookings_contacted":
      return "Mark contacted";
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
