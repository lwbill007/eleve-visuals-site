/**
 * Link business events to the knowledge graph without a full platform refresh.
 */

import { linkMemories } from "../memory/graph";
import { getMemory, writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { BusinessEvent } from "./business-events";

export async function linkBusinessEventToGraph(event: BusinessEvent): Promise<number> {
  const workspaceId = getWorkspaceId();
  let links = 0;

  async function ensureMemory(layer: string, category: string, key: string, title: string, sourceRef: string) {
    const existing = await getMemory(layer as Parameters<typeof getMemory>[0], category, key, workspaceId);
    if (existing) return existing.id;
    const mem = await writeMemory({
      workspaceId,
      layer: layer as Parameters<typeof writeMemory>[0]["layer"],
      category,
      key,
      title,
      summary: title,
      value: { eventType: event.type, entityId: event.entityId },
      confidence: 0.85,
      importance: 60,
      source: "sync",
      sourceRef,
      tags: ["graph", "event", event.type],
      actor: "event-graph",
    });
    return mem.id;
  }

  if (event.type === "booking_created" && event.entityId) {
    const subId = await ensureMemory(
      "crm",
      "lead",
      `submission-${event.entityId}`,
      `Booking inquiry ${event.entityId}`,
      `submission:${event.entityId}`
    );
    const bookPage = await getMemory("marketing", "page_intel", "page:/book", workspaceId);
    if (bookPage) {
      await linkMemories(subId, bookPage.id, "submitted_via", 1, { submissionId: event.entityId }).catch(() => {});
      links += 1;
    }
    const pipelineMem = await getMemory("business", "pipeline-live", "pipeline", workspaceId);
    if (pipelineMem) {
      await linkMemories(subId, pipelineMem.id, "contributed_revenue", 0.8).catch(() => {});
      links += 1;
    }
  }

  if (event.type === "application_received" && event.entityId) {
    const appId = await ensureMemory(
      "sessions",
      "application",
      `submission-${event.entityId}`,
      `Session application ${event.entityId}`,
      `submission:${event.entityId}`
    );
    const sessionsPage = await getMemory("marketing", "page_intel", "page:/sessions", workspaceId);
    if (sessionsPage) {
      await linkMemories(appId, sessionsPage.id, "submitted_via", 1).catch(() => {});
      links += 1;
    }
  }

  if (event.type === "portfolio_published" && event.entityId) {
    const projId = await ensureMemory(
      "creative",
      "project",
      `portfolio-${event.entityId}`,
      `Portfolio publish ${event.entityId}`,
      `portfolio:${event.entityId}`
    );
    const portfolioPage = await getMemory("marketing", "page_intel", "page:/portfolio", workspaceId);
    if (portfolioPage) {
      await linkMemories(projId, portfolioPage.id, "discovered_via", 0.9).catch(() => {});
      links += 1;
    }
  }

  if (event.type === "mission_completed" && event.entityId) {
    const lessonId = await ensureMemory(
      "business",
      "mission_outcome",
      event.entityId,
      `Mission outcome ${event.entityId}`,
      `mission:${event.entityId}`
    );
    const dnaMem = await getMemory("business", "business_dna", "default", workspaceId);
    if (dnaMem) {
      await linkMemories(lessonId, dnaMem.id, "learned_from", 0.95).catch(() => {});
      links += 1;
    }
  }

  return links;
}
