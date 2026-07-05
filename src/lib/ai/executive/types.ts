import type {
  BusinessAction,
  ExecutiveForecast,
  ExecutiveIntelligence,
  ExecutiveOpportunity,
  ExecutiveRisk,
  ExecutiveScore,
  ExecutionDraft,
} from "../types";
import type { CMODailyBriefing } from "../marketing/types";

export type ExecutiveRoleId =
  | "ceo"
  | "cmo"
  | "cso"
  | "creative"
  | "brand"
  | "client_success"
  | "operations";

export type InsightClassification = "fact" | "prediction" | "suggestion" | "inference" | "unknown";

export interface ExecutiveRoleBrief {
  id: ExecutiveRoleId;
  title: string;
  mission: string;
  healthScore: number;
  confidence: number;
  topPriority: string;
  insights: { text: string; kind: InsightClassification; evidence?: string[] }[];
  recommendations: {
    id: string;
    title: string;
    detail: string;
    why: string;
    kind: InsightClassification;
    confidence: number;
    expectedImpact: string;
    actions: BusinessAction[];
  }[];
  metrics: { label: string; value: string; source: string }[];
  href: string;
}

export interface CommandCenterState {
  morningBriefing: string;
  businessHealth: number;
  marketingHealth: number;
  salesHealth: number;
  revenueHealth: number;
  websiteHealth: number;
  seoHealth: number;
  brandHealth: number;
  clientHealth: number;
  operationsHealth: number;
  topOpportunity: ExecutiveOpportunity | null;
  topRisk: ExecutiveRisk | null;
  highestRoiTask: {
    title: string;
    why: string;
    revenueImpact: number;
    href: string;
    confidence: number;
  } | null;
  highestPriorityTask: { title: string; href: string; urgency: string } | null;
  urgentAlerts: { id: string; title: string; detail: string; href: string; severity: string }[];
  scores: ExecutiveScore[];
}

export interface DecisionEngineContext {
  checkedAt: string;
  memoryHits: number;
  sources: string[];
  facts: string[];
  predictions: string[];
  suggestions: string[];
  inferences: string[];
  unknowns: string[];
  metricsSummary: string;
  whyPreamble: string;
}

export interface SelfImprovementLesson {
  id: string;
  question: string;
  outcome: string;
  confidenceChange: "increased" | "decreased" | "unchanged";
  lesson: string;
  recordedAt: string;
  domain: string;
}

export interface KnowledgeGraphStats {
  nodes: number;
  edges: number;
  layers: Record<string, number>;
  recentLinks: string[];
}

export interface ExecutiveOS {
  generatedAt: string;
  mission: string[];
  roles: ExecutiveRoleBrief[];
  commandCenter: CommandCenterState;
  intelligence: ExecutiveIntelligence;
  cmoBriefing?: CMODailyBriefing;
  decisionContext: DecisionEngineContext;
  predictions: ExecutiveForecast[];
  automationQueue: ExecutionDraft[];
  selfImprovement: SelfImprovementLesson[];
  knowledgeGraph: KnowledgeGraphStats;
  transparency: {
    dataSources: string[];
    facts: string[];
    predictions: string[];
    suggestions: string[];
    inferences: string[];
    unknowns: string[];
  };
}

export const EXECUTIVE_MISSION = [
  "Increase revenue",
  "Increase bookings",
  "Increase client satisfaction",
  "Increase brand value",
  "Increase operational efficiency",
  "Reduce repetitive work",
  "Protect the brand",
  "Continuously learn",
] as const;

export const ROLE_META: Record<
  ExecutiveRoleId,
  { title: string; mission: string; href: string }
> = {
  ceo: {
    title: "Chief Executive Officer",
    mission: "Company health, strategic priorities, risk, long-term growth",
    href: "/admin/intelligence",
  },
  cmo: {
    title: "Chief Marketing Officer",
    mission: "Marketing strategy, campaigns, SEO, funnels, conversion",
    href: "/admin/marketing",
  },
  cso: {
    title: "Chief Sales Officer",
    mission: "Pipeline, booking probability, revenue forecast, upsell",
    href: "/admin/pipeline",
  },
  creative: {
    title: "Creative Director",
    mission: "Portfolio, sessions, visual consistency, brand evolution",
    href: "/admin/portfolio",
  },
  brand: {
    title: "Brand Director",
    mission: "Tone, visual identity, luxury positioning, perception",
    href: "/admin/homepage",
  },
  client_success: {
    title: "Client Success Director",
    mission: "CRM, satisfaction, repeat business, loyalty",
    href: "/admin/crm",
  },
  operations: {
    title: "Operations Director",
    mission: "Automations, efficiency, workflow, task prioritization",
    href: "/admin/automations",
  },
};
