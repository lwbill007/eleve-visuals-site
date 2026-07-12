/**
 * Per-agent memory — specialists retain preferences, objections, locations, margins.
 */

import { writeMemory, searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { OrchestratorAgentId } from "./tool-registry";

const AGENT_MEMORY_CATEGORY: Record<OrchestratorAgentId, string> = {
  creative: "agent_memory_creative",
  sales_advisor: "agent_memory_sales",
  production_manager: "agent_memory_production",
  business_strategist: "agent_memory_business",
  research_specialist: "agent_memory_research",
  ceo: "agent_memory_ceo",
  cmo: "agent_memory_cmo",
  seo: "agent_memory_seo",
};

export async function rememberForAgent(
  agentId: OrchestratorAgentId,
  input: {
    key: string;
    title: string;
    summary: string;
    value: Record<string, unknown>;
    importance?: number;
  }
) {
  return writeMemory({
    workspaceId: getWorkspaceId(),
    category: AGENT_MEMORY_CATEGORY[agentId],
    layer: "operational",
    key: `${agentId}:${input.key}`,
    title: input.title,
    summary: input.summary,
    value: { agentId, ...input.value },
    confidence: 0.8,
    importance: input.importance ?? 0.7,
    source: "ai",
    sourceRef: `agent:${agentId}`,
    tags: ["agent-memory", agentId],
  });
}

export async function recallAgentMemory(
  agentId: OrchestratorAgentId,
  limit = 8
): Promise<string> {
  try {
    const res = await searchMemories({
      workspaceId: getWorkspaceId(),
      category: AGENT_MEMORY_CATEGORY[agentId],
      limit,
    });
    if (!res.items.length) return `No prior ${agentId} memory on file.`;
    return res.items
      .map((m) => `• ${m.title}: ${m.summary}`)
      .join("\n");
  } catch {
    return `Agent memory unavailable for ${agentId}.`;
  }
}

export function agentMemoryHints(agentId: OrchestratorAgentId): string[] {
  switch (agentId) {
    case "creative":
      return ["favorite editing style", "preferred lenses", "client visual preferences"];
    case "sales_advisor":
      return ["objections", "buying behavior", "previous quotes"];
    case "production_manager":
      return ["locations", "equipment", "crew"];
    case "business_strategist":
      return ["pricing", "margins", "repeat clients"];
    case "research_specialist":
      return ["verified sources", "trend notes", "competitor snapshots"];
    default:
      return ["prior decisions", "outcomes"];
  }
}
