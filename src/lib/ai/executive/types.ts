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
import type { SynthesizedExecutiveBriefing } from "./synthesizer";
import type { NorthStarMetrics } from "./north-star";
import type { RevenueLeak } from "./revenue-leaks";
import type { WeeklyExecutiveReport } from "../intelligence/weekly-executive-report";
import type { ExecutiveOperatingSystem } from "./operating-system-types";

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
  graphHealth?: import("../truth/types").GraphHealth;
}

export interface ExecutiveOS {
  generatedAt: string;
  mission: string[];
  roles: ExecutiveRoleBrief[];
  commandCenter: CommandCenterState;
  intelligence: ExecutiveIntelligence;
  synthesis: SynthesizedExecutiveBriefing;
  cmoBriefing?: CMODailyBriefing;
  decisionContext: DecisionEngineContext;
  predictions: ExecutiveForecast[];
  automationQueue: ExecutionDraft[];
  selfImprovement: SelfImprovementLesson[];
  knowledgeGraph: KnowledgeGraphStats;
  embeddingStats?: { chunks: number; memories: number; mode: "api" | "local" };
  northStar: NorthStarMetrics;
  revenueLeaks: RevenueLeak[];
  weeklyReport: WeeklyExecutiveReport;
  intelligenceSuite?: import("../types").IntelligenceSuite;
  operatingSystem: ExecutiveOperatingSystem;
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
  "More qualified inquiries",
  "More bookings",
  "Higher average project value",
  "Stronger brand perception",
  "Better customer experience",
  "Better operational efficiency",
  "Better decision making",
  "Sustainable long-term growth",
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
