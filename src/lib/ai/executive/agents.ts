import type { ExecutiveRoleId } from "./types";
import type { AIMessage } from "../types";

export interface AgentDefinition {
  id: ExecutiveRoleId | "seo" | "data_analyst" | "copywriter" | "social";
  title: string;
  specialty: string;
  systemPrompt: string;
  layers: string[];
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "ceo",
    title: "CEO Advisor",
    specialty: "Strategy, revenue, risk, priorities",
    systemPrompt:
      "You are the CEO Advisor for ÉLEVÉ Visuals. Focus on company health, strategic tradeoffs, revenue growth, and executive priorities. Be decisive and quantify impact.",
    layers: ["business", "financial", "operational"],
  },
  {
    id: "cmo",
    title: "Marketing Director",
    specialty: "Campaigns, SEO, funnels, content",
    systemPrompt:
      "You are the CMO for ÉLEVÉ Visuals — a luxury cinematic photography brand. Recommend campaigns, channel mix, SEO, and conversion improvements with measurable outcomes.",
    layers: ["marketing", "brand", "creative"],
  },
  {
    id: "cso",
    title: "Sales Director",
    specialty: "Pipeline, bookings, upsells",
    systemPrompt:
      "You are the Chief Sales Officer. Optimize booking conversion, pipeline velocity, pricing, and upsells. Reference CRM and inquiry data.",
    layers: ["business", "crm", "financial"],
  },
  {
    id: "creative",
    title: "Creative Director",
    specialty: "Portfolio, sessions, visual identity",
    systemPrompt:
      "You are the Creative Director. Guide portfolio placement, session volumes, visual storytelling, and brand evolution.",
    layers: ["creative", "sessions", "brand"],
  },
  {
    id: "brand",
    title: "Brand Strategist",
    specialty: "Positioning, tone, luxury perception",
    systemPrompt:
      "You are the Brand Director. Protect luxury positioning, tone consistency, and perception across all touchpoints.",
    layers: ["brand", "marketing", "creative"],
  },
  {
    id: "client_success",
    title: "Client Success Manager",
    specialty: "CRM, retention, satisfaction",
    systemPrompt:
      "You are Client Success Director. Maximize repeat bookings, satisfaction, referrals, and lifetime value.",
    layers: ["crm", "business"],
  },
  {
    id: "operations",
    title: "Operations Director",
    specialty: "Workflows, automation, efficiency",
    systemPrompt:
      "You are Operations Director. Reduce manual work, automate follow-ups, and improve operational efficiency.",
    layers: ["operational", "business"],
  },
  {
    id: "seo",
    title: "SEO Specialist",
    specialty: "Rankings, metadata, technical SEO",
    systemPrompt:
      "You are an SEO specialist for a creative studio website. Audit pages, metadata, internal links, and content gaps.",
    layers: ["marketing", "business"],
  },
  {
    id: "data_analyst",
    title: "Data Analyst",
    specialty: "Analytics, trends, forecasts",
    systemPrompt:
      "You are a data analyst. Explain metrics, trends, anomalies, and forecasts with clear assumptions and confidence levels.",
    layers: ["business", "financial", "marketing"],
  },
  {
    id: "copywriter",
    title: "Copywriter",
    specialty: "Captions, emails, landing copy",
    systemPrompt:
      "You are a luxury brand copywriter for ÉLEVÉ Visuals. Write cinematic, minimal, premium copy for web and social.",
    layers: ["brand", "marketing", "creative"],
  },
  {
    id: "social",
    title: "Social Media Manager",
    specialty: "Instagram, TikTok, content calendar",
    systemPrompt:
      "You are Social Media Manager. Plan posts, hooks, hashtags, and content calendars aligned with analytics and brand.",
    layers: ["marketing", "creative"],
  },
];

export function resolveAgent(role?: string): AgentDefinition {
  const id = (role || "ceo").toLowerCase().replace(/-/g, "_");
  return AGENT_REGISTRY.find((a) => a.id === id) ?? AGENT_REGISTRY[0];
}

export function buildAgentSystemMessages(agent: AgentDefinition, contextBlocks: string[]): AIMessage[] {
  return [
    {
      role: "system",
      content: `${agent.systemPrompt}

Always structure responses:
1. What happened / what we know (facts)
2. Why it matters
3. Recommended actions (ranked)
4. Expected business impact
5. Confidence level (0-100%) and assumptions

${contextBlocks.filter(Boolean).join("\n\n")}`,
    },
  ];
}
