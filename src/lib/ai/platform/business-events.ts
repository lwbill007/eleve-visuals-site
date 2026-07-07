/**
 * Principle #7 — Continuous Learning
 * Every business event improves intelligence (knowledge, graph, verification, predictions).
 */

import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import { invalidateIntelligenceCaches } from "../cognitive/cache";
import type { RefreshTrigger } from "../memory/knowledge/types";

export const BUSINESS_EVENT_TYPES = [
  "booking_created",
  "booking_updated",
  "invoice_paid",
  "gallery_delivered",
  "portfolio_published",
  "session_launched",
  "application_received",
  "sponsor_added",
  "review_received",
  "campaign_launched",
  "instagram_published",
  "website_deployed",
  "seo_changed",
  "pricing_changed",
  "session_completed",
  "client_returned",
  "mission_completed",
  "recommendation_feedback",
  "intelligence_refreshed",
] as const;

export type BusinessEventType = (typeof BUSINESS_EVENT_TYPES)[number];

export interface BusinessEvent {
  type: BusinessEventType;
  entityId?: string;
  entityType?: string;
  payload?: Record<string, unknown>;
  actor?: string;
  source?: string;
}

const EVENT_TO_REFRESH_TRIGGER: Partial<Record<BusinessEventType, RefreshTrigger>> = {
  booking_created: "booking_received",
  portfolio_published: "portfolio_upload",
  session_launched: "session_publish",
  application_received: "booking_received",
  intelligence_refreshed: "manual",
};

/**
 * Emit a business event — audit log + async intelligence side effects.
 * Idempotent handlers should key on entityId + type where applicable.
 */
export async function emitBusinessEvent(event: BusinessEvent): Promise<{ logged: boolean }> {
  const workspaceId = getWorkspaceId();
  const details = JSON.stringify({
    workspaceId,
    entityId: event.entityId,
    entityType: event.entityType,
    payload: event.payload ?? {},
    source: event.source ?? "system",
  });

  await prisma.activityLog.create({
    data: {
      actor: event.actor ?? "system",
      action: `business_event:${event.type}`,
      target: event.entityId ?? "",
      details,
    },
  });

  void processBusinessEventSideEffects(event).catch(() => {});

  return { logged: true };
}

async function processBusinessEventSideEffects(event: BusinessEvent): Promise<void> {
  const trigger = EVENT_TO_REFRESH_TRIGGER[event.type];

  if (event.type === "mission_completed" || event.type === "recommendation_feedback") {
    return;
  }

  if (trigger) {
    const { triggerIntelligenceRefreshBackground } = await import("../memory/knowledge/trigger");
    triggerIntelligenceRefreshBackground(trigger);
    return;
  }

  if (
    event.type === "booking_created" ||
    event.type === "application_received" ||
    event.type === "portfolio_published"
  ) {
    const { runAutoVerification } = await import("../memory/verification");
    await runAutoVerification().catch(() => ({ promoted: 0, trusted: 0 }));
    await invalidateIntelligenceCaches();
  }
}

export async function getRecentBusinessEvents(limit = 30): Promise<
  {
    id: string;
    type: BusinessEventType;
    entityId: string;
    payload: Record<string, unknown>;
    actor: string;
    at: string;
  }[]
> {
  const rows = await prisma.activityLog.findMany({
    where: { action: { startsWith: "business_event:" } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.details || "{}") as { payload?: Record<string, unknown> };
      payload = parsed.payload ?? {};
    } catch {
      /* ignore */
    }
    return {
      id: r.id,
      type: r.action.replace("business_event:", "") as BusinessEventType,
      entityId: r.target,
      payload,
      actor: r.actor,
      at: r.createdAt.toISOString(),
    };
  });
}
