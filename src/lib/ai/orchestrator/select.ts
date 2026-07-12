/**
 * Agent selection — not every request invokes every agent.
 */

import type { OrchestratorAgentId } from "../agents/tool-registry";
import type { OrchestratorTaskKind } from "./types";

const TASK_AGENTS: Record<OrchestratorTaskKind, OrchestratorAgentId[]> = {
  booking_submitted: [
    "sales_advisor",
    "business_strategist",
    "creative",
    "production_manager",
    "research_specialist",
  ],
  booking_review: [
    "sales_advisor",
    "creative",
    "production_manager",
  ],
  proposal_assist: ["sales_advisor", "business_strategist", "creative"],
  website_seo: ["seo", "cmo", "research_specialist"],
  portfolio_review: ["creative", "cmo", "seo"],
  crm_follow_up: ["sales_advisor", "business_strategist"],
  general_executive: ["ceo", "business_strategist"],
};

export function selectAgentsForTask(task: OrchestratorTaskKind): OrchestratorAgentId[] {
  return TASK_AGENTS[task] ?? ["ceo"];
}

export function agentTitle(id: OrchestratorAgentId): string {
  const map: Record<OrchestratorAgentId, string> = {
    sales_advisor: "Sales Advisor",
    business_strategist: "Business Strategist",
    creative: "Creative Director",
    production_manager: "Production Manager",
    research_specialist: "Research Specialist",
    ceo: "Chief Executive Officer",
    cmo: "Chief Marketing Officer",
    seo: "SEO Specialist",
  };
  return map[id];
}
