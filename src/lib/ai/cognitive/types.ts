import type { DataQualityLabel } from "../executive/data-quality";
import type { MemoryLayer } from "../memory/types";
import type { RefreshLearnReport } from "../memory/knowledge/types";

export type CognitiveSystemId =
  | "executive_intelligence"
  | "business_brain"
  | "knowledge_graph"
  | "business_dna"
  | "learning_engine"
  | "prediction_engine"
  | "decision_engine"
  | "opportunity_engine"
  | "risk_engine"
  | "memory_explorer"
  | "timeline"
  | "automation_intelligence"
  | "unknowns_center"
  | "evidence_center"
  | "strategy_simulator";

export type KnowledgeObjectType =
  | "client"
  | "lead"
  | "campaign"
  | "booking"
  | "project"
  | "portfolio"
  | "page"
  | "package"
  | "service"
  | "workflow"
  | "automation"
  | "conversation"
  | "decision"
  | "prediction"
  | "lesson"
  | "experiment"
  | "opportunity"
  | "risk"
  | "revenue_event"
  | "marketing_asset"
  | "sponsor"
  | "session"
  | "volume"
  | "photographer"
  | "model"
  | "location"
  | "equipment"
  | "invoice"
  | "task"
  | "review"
  | "email"
  | "form";

export interface CognitiveSystemMeta {
  id: CognitiveSystemId;
  label: string;
  description: string;
  status: "active" | "partial" | "unavailable";
  contribution: string;
}

export interface BusinessDNA {
  generatedAt: string;
  confidence: number;
  mission: string;
  vision: string;
  coreValues: string[];
  luxuryPositioning: string;
  brandPersonality: string;
  toneOfVoice: string;
  idealClients: string[];
  targetMarkets: string[];
  competitiveAdvantages: string[];
  services: { title: string; price?: string; philosophy?: string }[];
  pricingPhilosophy: string;
  creativeDirection: string;
  photographyStyle: string;
  editingStyle: string;
  businessGoals: string[];
  growthStrategy: string;
  northStarMetrics: string[];
  companyCulture: string;
  decisionPrinciples: string[];
  businessRules: string[];
  brandStandards: string[];
  competitivePosition: string;
}

export interface KnowledgeObject {
  id: string;
  type: KnowledgeObjectType;
  title: string;
  summary: string;
  layer: MemoryLayer;
  category: string;
  confidence: number;
  importance: number;
  businessImpact: string;
  evidence: string[];
  owner: string;
  lifecycle: "active" | "archived" | "draft";
  status: string;
  roi?: number;
  tags: string[];
  verified: boolean;
  version: number;
  relationshipCount: number;
  updatedAt: string;
  memoryId: string;
}

export interface ExecutiveReasoning {
  observed: string[];
  learned: string[];
  compared: string[];
  verified: string[];
  predicted: string[];
  concluded: string;
  recommended: string;
  expectedOutcome: string;
  confidence: number;
  evidence: string[];
  businessImpact: string;
  unknowns: string[];
  alternatives: string[];
}

export interface DecisionJournalEntry {
  id: string;
  recommendation: string;
  status: "accepted" | "rejected" | "pending" | "completed";
  outcome?: "positive" | "negative" | "neutral";
  revenueImpact?: number;
  bookingImpact?: number;
  timeSaved?: number;
  predictionAccuracy?: number;
  lesson?: string;
  recordedAt: string;
  domain: string;
}

export interface UnknownItem {
  id: string;
  category: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  howToResolve: string;
  blocksDecisions: string[];
}

export interface KnowledgeHealthScore {
  id: string;
  label: string;
  score: number;
  quality: DataQualityLabel;
  why: string;
  howToImprove: string;
}

export interface ExecutiveBriefing {
  generatedAt: string;
  executiveSummary: string;
  biggestDiscovery: string;
  biggestOpportunity: string;
  biggestRisk: string;
  revenueImpact: string;
  brandImpact: string;
  websiteImpact: string;
  marketingImpact: string;
  salesImpact: string;
  knowledgeChanges: string[];
  recommendedActions: { title: string; href: string; expectedRoi: string }[];
  unknowns: string[];
  expectedRoi: string;
}

export interface StrategySimulation {
  scenario: string;
  revenue: { low: number; mid: number; high: number };
  bookings: { low: number; mid: number; high: number };
  demand: string;
  brandPerception: string;
  profit: { low: number; mid: number; high: number };
  capacity: string;
  risk: string;
  confidence: number;
  assumptions: string[];
}

export interface GraphGrowthPoint {
  date: string;
  nodes: number;
  edges: number;
}

import type { GraphHealth } from "../truth/types";

export interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  type: "metric" | "memory" | "event" | "learning" | "prediction";
  confidence: number;
  businessImpact: string;
  freshness: string;
}

export interface CognitiveArchitecture {
  generatedAt: string;
  systems: CognitiveSystemMeta[];
  businessDna: BusinessDNA;
  knowledgeObjects: KnowledgeObject[];
  objectCounts: Record<KnowledgeObjectType, number>;
  graph: {
    nodes: { id: string; label: string; layer: string; type?: string }[];
    edges: { id: string; from: string; to: string; relationType: string; weight: number }[];
    growth: GraphGrowthPoint[];
    chainExample: string[];
    totalNodes: number;
    totalEdges: number;
    health: GraphHealth;
  };
  reasoning: ExecutiveReasoning;
  learningPatterns: {
    pattern: string;
    confidence: number;
    businessImpact: string;
    source: string;
  }[];
  decisionJournal: DecisionJournalEntry[];
  unknowns: UnknownItem[];
  knowledgeHealth: KnowledgeHealthScore[];
  executiveBriefing: ExecutiveBriefing;
  lastRefresh: RefreshLearnReport | null;
  evidence: EvidenceItem[];
  automation: {
    triggers: { id: string; label: string; enabled: boolean }[];
    lastRun?: string;
    nextScheduled?: string;
  };
}
