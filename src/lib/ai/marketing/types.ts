import type { AIGenerateTask, BusinessAction, ExecutiveScore } from "../types";

export type CampaignPlatform =
  | "instagram"
  | "instagram_reel"
  | "instagram_story"
  | "instagram_carousel"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "email"
  | "sms"
  | "website"
  | "landing_page"
  | "meta_ads"
  | "google_ads"
  | "referral"
  | "partnership"
  | "sponsor"
  | "flyer"
  | "other";

export type InsightKind = "fact" | "prediction" | "assumption" | "idea";

export interface BrandInstitutionalMemory {
  identity: {
    name: string;
    tagline: string;
    description: string;
    voice: string;
    visualStyle: string;
    tone: string;
  };
  idealClients: string[];
  businessGoals: string[];
  services: { title: string; price: string; tagline: string }[];
  competitiveAdvantages: string[];
  customerJourney: string[];
  salesFunnel: string[];
  websiteStructure: string[];
  portfolioHighlights: string[];
  sessionsOverview: string[];
  awards: string[];
  sponsorships: string[];
  lastSyncedAt: string;
}

export interface CampaignCaseStudy {
  id: string;
  title: string;
  platform: CampaignPlatform;
  contentType: string;
  objective: string;
  audience: string;
  creative: string;
  headline: string;
  hook: string;
  cta: string;
  offer: string;
  budget?: number;
  postingTime?: string;
  metrics: {
    reach?: number;
    views?: number;
    clicks?: number;
    ctr?: number;
    leads?: number;
    bookings?: number;
    revenue?: number;
    roi?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    growth?: number;
  };
  lessonsLearned: string[];
  status: "draft" | "published" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
  memoryId?: string;
}

export interface MarketingPattern {
  id: string;
  category:
    | "hook"
    | "cta"
    | "posting_time"
    | "pricing"
    | "offer"
    | "landing_page"
    | "thumbnail"
    | "portfolio"
    | "testimonial"
    | "email_subject"
    | "service_description"
    | "session"
    | "acquisition_channel"
    | "seasonal"
    | "client_ltv";
  pattern: string;
  evidence: string[];
  confidence: number;
  sampleSize: number;
  impact: string;
  lastObservedAt: string;
}

export interface MarketingExperiment {
  id: string;
  title: string;
  hypothesis: string;
  variable: string;
  variantA: string;
  variantB: string;
  platform: string;
  status: "recommended" | "running" | "winner_declared" | "inconclusive";
  winner?: "A" | "B";
  results?: { variant: "A" | "B"; metric: string; value: number }[];
  confidence: number;
  recommendation: string;
  createdAt: string;
}

export interface MarketingPrediction {
  id: string;
  subject: string;
  platform?: string;
  expectedEngagement: string;
  expectedLeads: number;
  expectedBookings: number;
  expectedRevenue: number;
  expectedRoi: string;
  probabilityOfSuccess: number;
  confidence: number;
  basis: string[];
  assumptions: string[];
  kind: InsightKind;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  positioning: string;
  offers: string[];
  pricingNotes: string[];
  contentStyle: string;
  postingFrequency: string;
  websiteNotes: string[];
  campaignIdeas: string[];
  marketTrends: string[];
  opportunitiesForUs: string[];
  lastUpdatedAt: string;
  memoryId?: string;
}

export interface ClientMarketingProfile {
  email: string;
  name: string;
  preferences: string[];
  favoriteStyles: string[];
  averageSpend: number;
  bookingHistory: number;
  referrals: number;
  communicationStyle: string;
  sessionHistory: string[];
  feedback: string[];
  satisfactionScore: number;
  retentionRisk: "low" | "medium" | "high";
  personalizedRecommendations: string[];
}

export interface RevenueAttribution {
  activity: string;
  channel: string;
  revenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
  ltv: number;
  leadQuality: number;
  paybackDays: number;
  rank: number;
  evidence: string[];
}

export interface TransparentRecommendation {
  id: string;
  title: string;
  detail: string;
  why: string;
  kind: InsightKind;
  confidence: number;
  historicalEvidence: string[];
  supportingMemories: string[];
  supportingMetrics: string[];
  alternatives: { label: string; tradeoff: string }[];
  expectedImpact: string;
  priority: number;
  actions: BusinessAction[];
}

export interface CMODailyBriefing {
  generatedAt: string;
  scores: ExecutiveScore[];
  biggestOpportunity: TransparentRecommendation | null;
  biggestRisk: TransparentRecommendation | null;
  recommendedActions: TransparentRecommendation[];
  highestRoiTask: TransparentRecommendation | null;
  autonomousInsights: string[];
}

export interface CMOIntelligence {
  generatedAt: string;
  brand: BrandInstitutionalMemory;
  campaigns: CampaignCaseStudy[];
  patterns: MarketingPattern[];
  experiments: MarketingExperiment[];
  predictions: MarketingPrediction[];
  competitors: CompetitorProfile[];
  clientProfiles: ClientMarketingProfile[];
  revenueAttribution: RevenueAttribution[];
  briefing: CMODailyBriefing;
  recommendations: TransparentRecommendation[];
  transparency: {
    dataSources: string[];
    facts: string[];
    predictions: string[];
    assumptions: string[];
    ideas: string[];
  };
}

export interface RegisterCampaignInput {
  title: string;
  platform: CampaignPlatform;
  contentType: string;
  objective?: string;
  audience?: string;
  creative?: string;
  headline?: string;
  hook?: string;
  cta?: string;
  offer?: string;
  task?: AIGenerateTask;
  status?: CampaignCaseStudy["status"];
}

export const TASK_TO_PLATFORM: Partial<Record<AIGenerateTask, CampaignPlatform>> = {
  instagram_caption: "instagram",
  instagram_story: "instagram_story",
  tiktok_caption: "tiktok",
  pinterest_pin: "pinterest",
  email_body: "email",
  newsletter: "email",
  facebook_post: "other",
  launch_campaign: "instagram",
  campaign: "email",
  follow_up: "email",
  seo_meta: "website",
  blog_post: "website",
};
