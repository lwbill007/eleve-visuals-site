/**
 * Continuous intelligence watchlist — surface only ÉLEVÉ-material topics.
 * No live polling until web connector is wired.
 */

import { CONTINUOUS_MONITOR_TOPICS } from "./charter";
import { listKnowledgeConnectors } from "../connectors/knowledge";
import type { ContinuousMonitorItem } from "./types";

export async function getContinuousIntelligenceStatus(): Promise<{
  connectorWired: boolean;
  items: ContinuousMonitorItem[];
  note: string;
}> {
  const connectors = await listKnowledgeConnectors();
  const web = connectors.find((c) => c.id === "web_search");
  const connectorWired = Boolean(web?.wired && web.health === "healthy");

  const items: ContinuousMonitorItem[] = CONTINUOUS_MONITOR_TOPICS.map((topic) => ({
    topic,
    materialToEleve: true,
    status: connectorWired ? "watching" : "no_connector",
    note: connectorWired
      ? "Monitor active — only material deltas will surface"
      : "Connector not wired — watching list defined, no fetches performed",
  }));

  return {
    connectorWired,
    items,
    note: connectorWired
      ? "Continuous intelligence ignores low-value news; only material ÉLEVÉ impacts surface."
      : "Continuous monitor topics are defined. Live fetches are blocked until web_search is connected — no fabricated news digests.",
  };
}
