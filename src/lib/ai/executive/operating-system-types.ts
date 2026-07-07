import type { BusinessAction, ExecutiveForecast, ExecutiveOpportunity, ExecutiveRisk } from "../types";
import type { QualifiedValue } from "./data-quality";
import type { ExecutiveConfidence } from "../truth/types";

export interface ExecutiveMission {
  id: string;
  title: string;
  reasoning: string;
  expectedRevenue: QualifiedValue<number>;
  expectedBookings: QualifiedValue<number>;
  timeMinutes: number;
  difficulty: string;
  confidence: number;
  evidence: string[];
  successMetric: string;
  href: string;
  actions: BusinessAction[];
  completed: boolean;
  confidenceDetail?: ExecutiveConfidence;
  deprioritized?: boolean;
  deprioritizeReason?: string;
}

export interface ExplainableHealthDomain {
  id: string;
  label: string;
  score: QualifiedValue<number>;
  trend30: number;
  trend90: number;
  historicalAvg: number;
  whyChanged: string;
  improved: string[];
  declined: string[];
  topActions: {
    title: string;
    revenueGain: number;
    minutes: number;
    href: string;
    why: string;
  }[];
}

export interface InstitutionalLearning {
  id: string;
  lesson: string;
  evidence: string[];
  source: string;
  confidence: number;
  businessImpact: string;
  learnedAt: string;
  timesReferenced: number;
  status: "verified" | "estimated" | "pending";
}

export interface RevenueJourneyNode {
  id: string;
  label: string;
  value: string;
  quality: import("./data-quality").DataQualityLabel;
  children?: RevenueJourneyNode[];
}

export interface EnrichedForecast extends ExecutiveForecast {
  confidenceInterval: string;
  historicalComparison: string;
  riskFactors: string[];
  howToImprove: string;
}

export interface SalesIntelligenceView {
  potentialRevenue: QualifiedValue<number>;
  leadsLikelyToClose: { name: string; value: number; probability: number; href: string }[];
  pipelineProbability: QualifiedValue<number>;
  lostRevenue: QualifiedValue<number>;
  missedFollowUps: number;
  recommendedConversations: string[];
  highestValueClientToday: { name: string; value: number; action: string; href: string } | null;
}

export interface MarketingIntelligenceView {
  recommendation: string;
  why: string;
  expectedReach: QualifiedValue<number>;
  expectedBookings: QualifiedValue<number>;
  expectedRevenue: QualifiedValue<number>;
  historicalComparison: string;
  confidence: number;
  evidence: string[];
}

export interface ClientRanked {
  name: string;
  email: string;
  vipScore: number;
  ltv: number;
  referralPotential: number;
  repeatProbability: number;
  engagementScore: number;
  satisfactionScore: number;
  churnRisk: number;
  nextBestAction: string;
  href: string;
}

export interface PageIntelligenceScore {
  path: string;
  label: string;
  trafficScore: number;
  conversionScore: number;
  seoScore: number;
  brandScore: number;
  uxScore: number;
  trustScore: number;
  revenueScore: number;
  contentScore: number;
  explanation: string;
}

export interface ExecutiveOperatingSystem {
  generatedAt: string;
  theOneThing: ExecutiveMission;
  morningBriefing: {
    biggestWin: string;
    biggestLeak: string;
    biggestOpportunity: string;
    whatAiLearned: string;
  };
  healthDomains: ExplainableHealthDomain[];
  highestRoiOpportunity: ExecutiveOpportunity | null;
  highestRisk: ExecutiveRisk | null;
  criticalNotifications: { id: string; title: string; detail: string; href: string; severity: string }[];
  todaysMissions: ExecutiveMission[];
  revenueJourney: RevenueJourneyNode;
  salesIntelligence: SalesIntelligenceView;
  marketingIntelligence: MarketingIntelligenceView;
  clientIntelligence: ClientRanked[];
  websiteIntelligence: PageIntelligenceScore[];
  institutionalMemory: InstitutionalLearning[];
  predictions: EnrichedForecast[];
  aiDecisions: {
    id: string;
    title: string;
    why: string;
    evidence: string[];
    confidence: number;
    revenueImpact: number;
    downside: string;
    href: string;
  }[];
}
