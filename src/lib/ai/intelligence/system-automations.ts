/**
 * System automations — real, runnable ops (not AI draft theater).
 * Custom AI-drafted workflows remain stored separately and stay disabled until a full runner exists.
 */

import { prisma } from "@/lib/db";
import { getPaymentRevenueSummary } from "@/lib/payments";
import { getVerificationStats } from "@/lib/ai/memory/verification";
import { getConnectorHealth } from "@/lib/ai/platform/connectors";

export interface SystemAutomationDef {
  id: string;
  name: string;
  description: string;
  trigger: string;
  /** What actually happens when run. */
  effect: string;
}

export interface SystemAutomationRunResult {
  id: string;
  name: string;
  ok: boolean;
  message: string;
  createdNotifications?: number;
}

export const SYSTEM_AUTOMATIONS: SystemAutomationDef[] = [
  {
    id: "sys-stale-booking-alert",
    name: "Stale booking alert",
    description: "Notify when booking inquiries sit 3+ days without progress.",
    trigger: "Every run / cron",
    effect: "Creates an AINotification linking to the booking inbox",
  },
  {
    id: "sys-pending-applications",
    name: "Pending applications alert",
    description: "Notify when session applications await a decision.",
    trigger: "Every run / cron",
    effect: "Creates an AINotification linking to Applications",
  },
  {
    id: "sys-verification-debt",
    name: "Knowledge verification debt",
    description: "Warn when verified memory share is below 40%.",
    trigger: "Every run / cron",
    effect: "Creates an AINotification linking to Business Brain",
  },
  {
    id: "sys-revenue-truth-gap",
    name: "Revenue truth gap",
    description: "Warn when pipeline exists but no settled Payment rows.",
    trigger: "Every run / cron",
    effect: "Creates an AINotification linking to Trust / Stripe setup",
  },
  {
    id: "sys-connector-blockers",
    name: "Connector blockers",
    description: "Warn when decision-critical connectors are down.",
    trigger: "Every run / cron",
    effect: "Creates an AINotification listing blocked decisions",
  },
];

async function recentDuplicate(type: string, hours = 12): Promise<boolean> {
  const since = new Date(Date.now() - hours * 3600_000);
  const existing = await prisma.aINotification.findFirst({
    where: { type, createdAt: { gte: since }, dismissed: false },
    select: { id: true },
  });
  return Boolean(existing);
}

async function notify(input: {
  type: string;
  severity: string;
  title: string;
  detail: string;
  href: string;
  metric?: string;
}): Promise<boolean> {
  if (await recentDuplicate(input.type)) return false;
  await prisma.aINotification.create({
    data: {
      type: input.type,
      severity: input.severity,
      title: input.title,
      detail: input.detail,
      href: input.href,
      metric: input.metric ?? "",
    },
  });
  return true;
}

export async function runSystemAutomation(id: string): Promise<SystemAutomationRunResult> {
  const def = SYSTEM_AUTOMATIONS.find((a) => a.id === id);
  if (!def) return { id, name: id, ok: false, message: "Unknown system automation." };

  switch (id) {
    case "sys-stale-booking-alert": {
      const cutoff = new Date(Date.now() - 3 * 86400000);
      const count = await prisma.submission.count({
        where: {
          type: "booking",
          status: { in: ["new", "contacted", "lead", "qualified", "discovery", "proposal"] },
          updatedAt: { lt: cutoff },
        },
      });
      if (count === 0) {
        return { id, name: def.name, ok: true, message: "No stale bookings.", createdNotifications: 0 };
      }
      const created = await notify({
        type: id,
        severity: count >= 3 ? "critical" : "high",
        title: `${count} stale booking inquir${count === 1 ? "y" : "ies"}`,
        detail: "Leads waiting 3+ days — reply or mark contacted from Work.",
        href: "/admin/submissions?type=booking",
        metric: String(count),
      });
      return {
        id,
        name: def.name,
        ok: true,
        message: created ? `Alerted on ${count} stale bookings.` : "Alert already sent recently.",
        createdNotifications: created ? 1 : 0,
      };
    }

    case "sys-pending-applications": {
      const count = await prisma.submission.count({
        where: {
          type: "session",
          status: { in: ["pending_review", "shortlisted", "interview"] },
        },
      });
      if (count === 0) {
        return { id, name: def.name, ok: true, message: "No pending applications.", createdNotifications: 0 };
      }
      const created = await notify({
        type: id,
        severity: count >= 10 ? "high" : "medium",
        title: `${count} application${count === 1 ? "" : "s"} need a decision`,
        detail: "Accepting sends the volume status email when templates are configured.",
        href: "/admin/applications",
        metric: String(count),
      });
      return {
        id,
        name: def.name,
        ok: true,
        message: created ? `Alerted on ${count} applications.` : "Alert already sent recently.",
        createdNotifications: created ? 1 : 0,
      };
    }

    case "sys-verification-debt": {
      const stats = await getVerificationStats();
      if (stats.verifiedPct >= 40 || stats.total < 20) {
        return {
          id,
          name: def.name,
          ok: true,
          message: `Verification at ${stats.verifiedPct}% — no alert.`,
          createdNotifications: 0,
        };
      }
      const created = await notify({
        type: id,
        severity: stats.verifiedPct < 20 ? "high" : "medium",
        title: `Knowledge only ${stats.verifiedPct}% verified`,
        detail: `${stats.pending} memories pending — recommendations may be weakly grounded.`,
        href: "/admin/memory",
        metric: String(stats.verifiedPct),
      });
      return {
        id,
        name: def.name,
        ok: true,
        message: created ? "Verification debt alerted." : "Alert already sent recently.",
        createdNotifications: created ? 1 : 0,
      };
    }

    case "sys-revenue-truth-gap": {
      const payments = await getPaymentRevenueSummary();
      const openPipeline = await prisma.submission.count({
        where: {
          type: "booking",
          status: {
            in: [
              "new",
              "contacted",
              "scheduled",
              "lead",
              "qualified",
              "discovery",
              "proposal",
              "booked",
              "planning",
            ],
          },
        },
      });
      if (payments.hasPayments || openPipeline === 0) {
        return {
          id,
          name: def.name,
          ok: true,
          message: payments.hasPayments
            ? "Settled payments present — revenue can be verified."
            : "No open pipeline — no truth gap alert.",
          createdNotifications: 0,
        };
      }
      const created = await notify({
        type: id,
        severity: "high",
        title: "Revenue still estimated — no settled payments",
        detail: "Connect Stripe webhook so Payment rows land and Truth Layer can verify revenue.",
        href: "/admin/qa",
        metric: "0",
      });
      return {
        id,
        name: def.name,
        ok: true,
        message: created ? "Revenue truth gap alerted." : "Alert already sent recently.",
        createdNotifications: created ? 1 : 0,
      };
    }

    case "sys-connector-blockers": {
      const connectors = getConnectorHealth().filter(
        (c) => c.health !== "healthy" && c.blocksDecisions.length > 0
      );
      if (connectors.length === 0) {
        return { id, name: def.name, ok: true, message: "No blocking connectors.", createdNotifications: 0 };
      }
      const labels = connectors.map((c) => c.label).slice(0, 4).join(", ");
      const blocked = [...new Set(connectors.flatMap((c) => c.blocksDecisions))].slice(0, 4);
      const created = await notify({
        type: id,
        severity: "medium",
        title: `${connectors.length} source${connectors.length === 1 ? "" : "s"} blocking decisions`,
        detail: `${labels}. Blocked: ${blocked.join("; ")}.`,
        href: "/admin/qa",
      });
      return {
        id,
        name: def.name,
        ok: true,
        message: created ? `Alerted on ${connectors.length} connectors.` : "Alert already sent recently.",
        createdNotifications: created ? 1 : 0,
      };
    }

    default:
      return { id, name: def.name, ok: false, message: "Not implemented." };
  }
}

export async function runAllSystemAutomations(): Promise<SystemAutomationRunResult[]> {
  const results: SystemAutomationRunResult[] = [];
  for (const def of SYSTEM_AUTOMATIONS) {
    results.push(await runSystemAutomation(def.id));
  }
  return results;
}
