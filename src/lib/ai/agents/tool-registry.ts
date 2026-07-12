/**
 * Per-agent tool registry — agents get tools, not just text generation.
 * Maps to executable BUSINESS_TOOLS today; stubs declare future connectors.
 */

import { BUSINESS_TOOLS, executeBusinessTool } from "../tools/business-data";
import type { AIToolDefinition } from "../types";

export type OrchestratorAgentId =
  | "sales_advisor"
  | "business_strategist"
  | "creative"
  | "production_manager"
  | "research_specialist"
  | "ceo"
  | "cmo"
  | "seo";

export interface AgentToolSpec {
  name: string;
  description: string;
  /** Maps to executeBusinessTool / future connector runners */
  executable: boolean;
  connector?: string;
}

const SHARED_LOOKUP: AgentToolSpec[] = [
  {
    name: "search_business",
    description: "Search clients, bookings, portfolio by keyword",
    executable: true,
  },
  {
    name: "get_business_snapshot",
    description: "High-level KPIs",
    executable: true,
  },
];

export const AGENT_TOOL_REGISTRY: Record<OrchestratorAgentId, AgentToolSpec[]> = {
  sales_advisor: [
    ...SHARED_LOOKUP,
    { name: "get_crm_contacts", description: "CRM lookup", executable: true, connector: "crm" },
    { name: "get_pipeline", description: "Pipeline stages & value", executable: true, connector: "booking_platform" },
    { name: "get_inactive_clients", description: "Re-engagement candidates", executable: true, connector: "crm" },
    { name: "proposal_generator", description: "Draft proposal (approval required to send)", executable: false, connector: "email" },
    { name: "pricing_engine", description: "Package + add-on pricing estimate", executable: false, connector: "booking_platform" },
  ],
  business_strategist: [
    ...SHARED_LOOKUP,
    { name: "get_pipeline", description: "Revenue pipeline", executable: true },
    { name: "get_analytics", description: "Traffic & conversion analytics", executable: true, connector: "analytics" },
    { name: "pricing_engine", description: "Margin / package economics", executable: false },
  ],
  creative: [
    ...SHARED_LOOKUP,
    { name: "get_portfolio_summary", description: "Portfolio search / placement", executable: true, connector: "portfolio" },
    { name: "moodboard_generator", description: "Generate moodboard brief", executable: false },
    { name: "color_palette_extraction", description: "Extract palette from references", executable: false },
    { name: "shot_list_builder", description: "Build shot list from brief", executable: false },
  ],
  production_manager: [
    ...SHARED_LOOKUP,
    { name: "weather_lookup", description: "Weather for shoot location/date", executable: false, connector: "weather" },
    { name: "sunrise_sunset", description: "Golden-hour window", executable: false, connector: "weather" },
    { name: "equipment_inventory", description: "Available gear", executable: false, connector: "equipment" },
    { name: "calendar_availability", description: "Schedule conflicts", executable: false, connector: "calendar" },
  ],
  research_specialist: [
    { name: "live_web_search", description: "Verified live web search", executable: false, connector: "web_search" },
    { name: "trend_analysis", description: "Industry / creative trends", executable: false, connector: "web_search" },
    { name: "competitor_lookup", description: "Competitor research", executable: false, connector: "web_search" },
    { name: "local_business_research", description: "Local market / permit context", executable: false, connector: "maps" },
    { name: "get_analytics", description: "Internal performance baselines", executable: true, connector: "analytics" },
  ],
  ceo: SHARED_LOOKUP,
  cmo: [
    ...SHARED_LOOKUP,
    { name: "get_analytics", description: "Marketing analytics", executable: true, connector: "analytics" },
  ],
  seo: [
    { name: "get_analytics", description: "Organic / page performance", executable: true, connector: "analytics" },
    { name: "get_portfolio_summary", description: "Portfolio discoverability", executable: true },
  ],
};

export function toolsForAgent(agentId: OrchestratorAgentId): AIToolDefinition[] {
  const specs = AGENT_TOOL_REGISTRY[agentId] || [];
  const names = new Set(specs.filter((s) => s.executable).map((s) => s.name));
  return BUSINESS_TOOLS.filter((t) => names.has(t.name));
}

export function toolNamesForAgent(agentId: OrchestratorAgentId): string[] {
  return (AGENT_TOOL_REGISTRY[agentId] || []).map((t) => t.name);
}

export async function runAgentTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; result: string; deferred?: boolean }> {
  const known = BUSINESS_TOOLS.some((t) => t.name === name);
  if (!known) {
    return {
      ok: false,
      deferred: true,
      result: JSON.stringify({
        status: "connector_not_wired",
        tool: name,
        message: "Tool declared but connector not connected — do not invent results.",
      }),
    };
  }
  try {
    const result = await executeBusinessTool(name, args);
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      result: JSON.stringify({ error: e instanceof Error ? e.message : "tool_failed" }),
    };
  }
}
