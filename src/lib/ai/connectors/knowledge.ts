/**
 * Knowledge Connectors — what the AI can access (internal + external).
 * Disconnected connectors degrade confidence; they never invent data.
 */

import { getConnectorHealth, type ConnectorHealth, type ConnectorId } from "../platform/connectors";

export type KnowledgeConnectorId =
  | ConnectorId
  | "web_search"
  | "weather"
  | "maps"
  | "equipment"
  | "portfolio"
  | "brand_guidelines"
  | "contracts"
  | "invoices"
  | "knowledge_base";

export interface KnowledgeConnector {
  id: KnowledgeConnectorId;
  label: string;
  kind: "internal" | "external";
  purpose: string;
  wired: boolean;
  health: "healthy" | "degraded" | "disconnected" | "planned";
  usedFor: string[];
}

const PLANNED: KnowledgeConnector[] = [
    {
      id: "web_search",
      label: "Live Web Search",
      kind: "external",
      purpose:
        "Gated Executive Research Division — trends, competitors, docs, pricing only when material; never invent when disconnected",
      wired: false,
      health: "planned",
      usedFor: ["research_specialist"],
    },
  {
    id: "weather",
    label: "Weather",
    kind: "external",
    purpose: "Shoot-day risk, golden hour planning",
    wired: false,
    health: "planned",
    usedFor: ["production_manager"],
  },
  {
    id: "maps",
    label: "Maps / Geocoding",
    kind: "external",
    purpose: "Locations, travel, local permits context",
    wired: false,
    health: "planned",
    usedFor: ["production_manager", "research_specialist"],
  },
  {
    id: "equipment",
    label: "Equipment Inventory",
    kind: "internal",
    purpose: "Gear availability and production readiness",
    wired: false,
    health: "planned",
    usedFor: ["production_manager"],
  },
  {
    id: "portfolio",
    label: "Portfolio Library",
    kind: "internal",
    purpose: "Creative reference and placement",
    wired: true,
    health: "healthy",
    usedFor: ["creative"],
  },
  {
    id: "brand_guidelines",
    label: "Brand Guidelines",
    kind: "internal",
    purpose: "Voice, visual system, luxury standards",
    wired: true,
    health: "healthy",
    usedFor: ["creative", "cmo"],
  },
  {
    id: "contracts",
    label: "Contracts",
    kind: "internal",
    purpose: "Legal / delivery terms",
    wired: false,
    health: "planned",
    usedFor: ["sales_advisor", "business_strategist"],
  },
  {
    id: "invoices",
    label: "Invoices / Payments",
    kind: "internal",
    purpose: "Revenue truth and deposit status",
    wired: false,
    health: "degraded",
    usedFor: ["business_strategist", "sales_advisor"],
  },
  {
    id: "knowledge_base",
    label: "Knowledge Base",
    kind: "internal",
    purpose: "Institutional memory and templates",
    wired: true,
    health: "healthy",
    usedFor: ["ceo", "research_specialist"],
  },
];

export async function listKnowledgeConnectors(): Promise<KnowledgeConnector[]> {
  let platform: ConnectorHealth[] = [];
  try {
    platform = getConnectorHealth();
  } catch {
    platform = [];
  }

  const fromPlatform: KnowledgeConnector[] = platform.map((c) => ({
    id: c.id,
    label: c.label,
    kind: ["analytics", "crm", "booking_platform", "neon", "stripe", "resend"].includes(c.id)
      ? "internal"
      : "external",
    purpose: c.blocksDecisions[0] || "Platform connector",
    wired: c.connected,
    health:
      c.health === "healthy"
        ? "healthy"
        : c.health === "degraded"
          ? "degraded"
          : c.health === "error"
            ? "degraded"
            : "disconnected",
    usedFor: ["ceo", "sales_advisor", "business_strategist"],
  }));

  const ids = new Set(fromPlatform.map((c) => c.id));
  return [...fromPlatform, ...PLANNED.filter((p) => !ids.has(p.id))];
}

export function connectorStatusForPrompt(connectors: KnowledgeConnector[]): string {
  const lines = connectors.map(
    (c) =>
      `• ${c.label} (${c.kind}): ${c.health}${c.wired ? "" : " — do not invent data from this connector"}`
  );
  return ["KNOWLEDGE CONNECTORS:", ...lines].join("\n");
}
