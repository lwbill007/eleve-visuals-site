export type AIProviderId = "openrouter" | "ollama";

export type AIRoutingTask =
  | "applicant_ranking"
  | "business_analysis"
  | "portfolio_review"
  | "vision_analysis"
  | "executive_summary"
  | "hiring_intelligence"
  | "creative_feedback"
  | "financial_analysis"
  | "marketing_strategy"
  | "json_extraction"
  | "long_form_reasoning"
  | "chat"
  | "content_generation"
  | "general";

export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  /** Optional image URLs for vision-capable providers. Text remains the source of truth for non-vision fallbacks. */
  images?: string[];
  toolName?: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  /** Request a JSON object response from providers that support JSON mode. */
  responseFormat?: "json";
  /** Optional JSON Schema used when the selected model supports structured outputs. */
  responseSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  /** Used by the central router to select the strongest compatible model. */
  task?: AIRoutingTask;
  /**
   * Optional semantic validation. A rejected completion is retried on the next
   * compatible model instead of escaping the provider fallback chain.
   */
  validateResponse?: (content: string) => boolean;
}

export interface AICompletionResult {
  content: string;
  toolCalls?: AIToolCall[];
  finishReason: "stop" | "tool_calls" | "error";
  /** Provider-native finish reason, e.g. "length" when the completion was truncated. */
  nativeFinishReason?: string;
  provider: AIProviderId;
  model: string;
  latencyMs?: number;
  cached?: boolean;
  attempts?: number;
  visionUsed?: boolean;
}

export interface AIStreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  text?: string;
  toolCall?: AIToolCall;
  error?: string;
}

export interface AIProvider {
  id: AIProviderId;
  model: string;
  isConfigured(): boolean;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
  stream?(request: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
}

export type AIGenerateTask =
  | "email_subject"
  | "email_body"
  | "follow_up"
  | "campaign"
  | "instagram_caption"
  | "instagram_story"
  | "blog_post"
  | "seo_meta"
  | "alt_text"
  | "client_summary"
  | "analytics_explain"
  | "sponsor_report"
  | "session_email"
  | "automation_workflow"
  | "facebook_post"
  | "pinterest_pin"
  | "tiktok_caption"
  | "newsletter"
  | "launch_campaign"
  | "threads_post"
  | "general";

export interface AIGenerateRequest {
  task: AIGenerateTask;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface BusinessAction {
  id: string;
  label: string;
  type:
    | "navigate"
    | "create_campaign"
    | "email_clients"
    | "instagram_draft"
    | "open_crm"
    | "create_workflow"
    | "export_report"
    | "sponsor_pdf"
    | "schedule_followup"
    | "generate_draft";
  href: string;
  task?: AIGenerateTask;
  prompt?: string;
}

export interface BusinessInsight {
  id: string;
  category: "sales" | "marketing" | "crm" | "sessions" | "operations";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  why: string;
  metric?: string;
  revenueImpact?: number;
  timeSavedMinutes?: number;
  priority: number;
  actions: BusinessAction[];
}

export interface MarketingRecommendation {
  id: string;
  channel: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  actions: BusinessAction[];
}

export interface SalesRecommendation {
  id: string;
  type: "upsell" | "cross_sell" | "recovery" | "discount" | "referral" | "follow_up";
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  actions: BusinessAction[];
}

export interface SessionsOperatorIntel {
  generatedAt: string;
  openVolume: {
    id: string;
    title: string;
    volumeNumber: number;
    applications: number;
    theme: string;
  } | null;
  totalApplications: number;
  pendingReview: number;
  castPublished: number;
  suggestedThemes: string[];
  recommendations: {
    id: string;
    title: string;
    detail: string;
    actions: BusinessAction[];
  }[];
}

export interface SelfImprovementItem {
  id: string;
  area: "ux" | "performance" | "automation" | "feature";
  title: string;
  detail: string;
  impact: string;
  actions: BusinessAction[];
}

export interface CommandCenterHub {
  keyword: string;
  title: string;
  summary: string;
  href: string;
  actions: BusinessAction[];
}

export interface AIBriefing {
  generatedAt: string;
  provider: AIProviderId | "rules";
  priorities: string[];
  opportunities: { title: string; detail: string; action: string; href: string }[];
  scores: {
    businessHealth: number;
    marketing: number;
    sales: number;
    productivity: number;
  };
  summary: string;
  forecast?: string;
}

export interface ExecutiveScore {
  key: string;
  label: string;
  value: number;
  previousValue?: number;
  change: number;
  trend: "up" | "down" | "flat";
  why: string;
  evidence: string[];
  dataSources: string[];
  confidence: number;
}

export interface ExecutiveOpportunity {
  id: string;
  title: string;
  detail: string;
  why: string;
  category: "revenue" | "marketing" | "sales" | "sessions" | "sponsors" | "operations";
  expectedRevenue: number;
  confidence: number;
  effort: "low" | "medium" | "high";
  urgency: "critical" | "high" | "medium" | "low";
  impact: string;
  evidence: string[];
  actions: BusinessAction[];
  estimatedMinutes: number;
  /** Recommendation contract fields */
  problem?: string;
  owner?: string;
  difficulty?: RecommendationDifficulty;
  status?: "proposed" | "accepted" | "in_progress" | "completed" | "verified" | "rejected";
  cost?: string;
  dependencies?: string[];
  successMetric?: string;
  verificationMethod?: string;
  learningStatus?: "proposed" | "accepted" | "in_progress" | "completed" | "verified" | "rejected";
}

export interface ExecutiveRisk {
  id: string;
  title: string;
  detail: string;
  why: string;
  category: "revenue" | "marketing" | "sales" | "operations" | "technical" | "crm" | "sessions" | "website" | "cash" | "portfolio" | "seo" | "ai" | "payments";
  severity: "critical" | "high" | "medium" | "low";
  likelihood: number;
  potentialImpact: number;
  evidence: string[];
  mitigations: BusinessAction[];
  detectedAt: string;
  owner?: string;
  deadline?: string | null;
  recoveryPlan?: string;
  verification?: string;
  domain?: string;
}

export interface ExecutiveDecision {
  id: string;
  title: string;
  recommendation: string;
  confidence: number;
  expectedOutcome: string;
  evidence: string[];
  historicalComparison?: string;
  riskLevel: "low" | "medium" | "high";
  estimatedRoi: number;
  implementationMinutes: number;
  alternatives: { label: string; tradeoff: string }[];
  actions: BusinessAction[];
}

export interface BusinessTimelineEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  category: "learning" | "revenue" | "marketing" | "sessions" | "portfolio" | "seo" | "milestone";
  impact?: string;
  source: string;
  verified: boolean;
  memoryId?: string;
}

export interface ExecutiveForecast {
  metric: string;
  label: string;
  current: number;
  predicted: number;
  low: number;
  high: number;
  confidence: number;
  horizon: string;
  why: string;
  assumptions: string[];
  unknowns: string[];
}

export interface ExecutionDraft {
  id: string;
  type: AIGenerateTask;
  title: string;
  description: string;
  status: "ready" | "needs_review";
  href: string;
  prompt: string;
  estimatedMinutes: number;
}

export interface ExecutiveIntelligence {
  generatedAt: string;
  scores: ExecutiveScore[];
  opportunities: ExecutiveOpportunity[];
  risks: ExecutiveRisk[];
  decisions: ExecutiveDecision[];
  timeline: BusinessTimelineEvent[];
  forecasts: ExecutiveForecast[];
  executionDrafts: ExecutionDraft[];
  totalOpportunityRevenue: number;
  revenueLeaks?: import("./executive/revenue-leaks").RevenueLeak[];
  transparency: {
    dataSources: string[];
    lastSynced: string;
    assumptions: string[];
    unknowns: string[];
  };
}

export interface AIDailyBriefing {
  generatedAt: string;
  provider: AIProviderId | "rules";
  summary: string;
  ceoHeadline: string;
  yesterday: { revenue: number; bookings: number };
  today: { bookings: number; leads: number; applications: number; subscribers: number; revenue: number };
  month: {
    revenue: number;
    revenueChange: number;
    bookings: number;
    bookingsChange: number;
  };
  traffic: {
    visitors30: number;
    conversionRate: number;
    conversionChange: number;
    topPage: string;
  };
  followUp: {
    inactiveClients: { name: string; email: string; daysSince: number }[];
    staleBookings: { id: string; name: string; daysSince: number; href: string }[];
    expiringFollowUps: number;
    galleriesAwaiting: number;
    overdueInvoices: number;
  };
  upcomingSessions: { id: string; title: string; date: string; status: string; href: string }[];
  weeklyPriorities: string[];
  scores: {
    businessHealth: number;
    marketing: number;
    sales: number;
    productivity: number;
    customerSatisfaction: number;
    growth: number;
  };
  /** Full executive scores with evidence — never show unexplained numbers */
  executiveScores?: ExecutiveScore[];
  /** Morning briefing intelligence sections */
  intelligence?: {
    opportunities: ExecutiveOpportunity[];
    risks: ExecutiveRisk[];
    clientsNeedingAttention: { name: string; email: string; daysSince: number; reason: string }[];
    marketingRecommendations: string[];
    recentLearnings: string[];
    websitePerformance: { summary: string; conversionRate: number; topPage: string };
    portfolioPerformance: { summary: string };
    sessionsPerformance: { summary: string };
  };
  executive: {
    highestRoiAction: {
      title: string;
      why: string;
      revenueImpact: number;
      timeSavedMinutes: number;
      href: string;
      actionLabel: string;
    } | null;
    projectedMonthlyRevenue: number;
    potentialLostRevenue: number;
    pipelineValue: number;
  };
  recommendedActions: {
    id: string;
    severity: string;
    title: string;
    detail: string;
    why?: string;
    action: string;
    href: string;
    actions?: BusinessAction[];
    category?: string;
    metric?: string;
    revenueImpact?: number;
    timeSavedMinutes?: number;
    priority?: number;
  }[];
  aiRecommendations: string[];
  forecast: { bookings: string; revenue: number; weekStart: string };
  /** Chief Marketing Officer intelligence layer */
  cmo?: import("./marketing/types").CMODailyBriefing;
  /** Structured morning executive brief */
  executiveMorning?: ExecutiveMorningBrief;
  /** Executive Intelligence Report 2.0 — evidence-graded, truth-labeled */
  reportV2?: import("./platform/executive-report-v2").ExecutiveReportV2;
  /**
   * Command Briefing contract (Phase 1):
   * Measured Facts → What Changed → Why → Evidence → Predictions → Recommendations → Confidence → Actions
   */
  commandContract?: {
    measuredFacts: { label: string; value: string; evidence: string[] }[];
    whatChanged: { label: string; detail: string; evidence: string[] }[];
    why: { statement: string; evidence: string[] }[];
    evidence: string[];
    predictions: import("./platform/recommendation-contract").PredictionContract[];
    recommendations: import("./platform/recommendation-contract").RecommendationContract[];
    confidence: { overall: number; why: string[] };
    actions: { id: string; label: string; href: string; evidence: string[] }[];
  };
}

export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationDifficulty = "easy" | "moderate" | "hard";

export interface PrioritizedRecommendation {
  id: string;
  title: string;
  detail: string;
  category: string;
  estimatedRevenue: number;
  confidence: number;
  timeToCompleteMinutes: number;
  difficulty: RecommendationDifficulty;
  priority: RecommendationPriority;
  whyNow: string;
  evidence: string[];
  actions: BusinessAction[];
}

export interface FunnelStepMetric {
  id: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
  dropOffRate: number;
  estimatedRevenueLost: number;
  insight: string;
}

export interface RevenueAttributionFunnel {
  generatedAt: string;
  periodDays: number;
  steps: FunnelStepMetric[];
  totalRevenue: number;
  totalRecoverable: number;
  biggestLeak: FunnelStepMetric | null;
}

export interface WebsiteHeatSection {
  path: string;
  label: string;
  views: number;
  conversions: number;
  conversionRate: number;
  engagementScore: number;
  insight: string;
}

export interface WebsiteHeatIntelligence {
  generatedAt: string;
  topConverters: WebsiteHeatSection[];
  ignoredSections: WebsiteHeatSection[];
  weakCtas: { path: string; issue: string; estimatedLoss: number }[];
  bestPhotos: { path: string; views: number; dwellProxy: number }[];
  scrollDropOff: { depth: number; sessions: number }[];
}

export interface BookingSourceMetric {
  source: string;
  inquiries: number;
  bookings: number;
  bookingRate: number;
  revenue: number;
  revenuePerInquiry: number;
}

export interface BookingServiceMetric {
  service: string;
  inquiries: number;
  bookingRate: number;
  avgValue: number;
}

export interface LostInquiry {
  id: string;
  name: string;
  reason: string;
  daysSince: number;
  estimatedValue: number;
  href: string;
}

export interface ExtendedBookingIntelligence {
  generatedAt: string;
  avgResponseTimeHours: number;
  avgInquiryToBookingDays: number;
  bySource: BookingSourceMetric[];
  byService: BookingServiceMetric[];
  lostInquiries: LostInquiry[];
  bookingRate: number;
}

export interface ContentPostMetric {
  id: string;
  title: string;
  platform: string;
  revenueGenerated: number;
  websiteVisits: number;
  profileVisits: number;
  shares: number;
  saves: number;
  watchTimeSeconds: number;
  followersGained: number;
  bookingsInfluenced: number;
  similarWinners: string[];
  dataSource: "memory" | "estimated" | "manual";
}

export interface ContentIntelligenceSummary {
  generatedAt: string;
  posts: ContentPostMetric[];
  topPerformingHooks: string[];
  recommendation: string;
  externalConnected: boolean;
}

export interface ClientIntelProfile {
  email: string;
  name: string;
  lifetimeValue: number;
  totalSessions: number;
  lastBooking: string | null;
  favoriteServices: string[];
  referralCount: number;
  birthdayReminder: string | null;
  upsellOpportunities: string[];
  followUpReminder: string | null;
  churnRisk: "low" | "medium" | "high";
}

export interface ClientIntelligenceSummary {
  generatedAt: string;
  clients: ClientIntelProfile[];
  atRiskCount: number;
  totalLtv: number;
}

export interface FinancialIntelligence {
  generatedAt: string;
  grossRevenue: number;
  netProfit: number;
  monthlyRecurringRevenue: number;
  averageProjectValue: number;
  revenuePerVisitor: number;
  customerAcquisitionCost: number;
  returnOnAdSpend: number;
  cashRunwayMonths: number;
  monthlyGrowthRate: number;
  confidence: number;
  assumptions: string[];
}

export interface PredictiveInsight {
  id: string;
  metric: string;
  trend: string;
  prediction: string;
  projectedChange: number;
  confidence: number;
  recoveryAction: string;
  recoveryImpact: string;
  estimatedRevenue: number;
}

export interface ExecutiveMemoryEntry {
  id: string;
  type: "decision" | "experiment" | "campaign" | "promotion" | "website_change" | "lesson";
  title: string;
  outcome: "success" | "failure" | "neutral" | "pending";
  summary: string;
  recordedAt: string;
  tags: string[];
}

export interface ExecutiveMemorySnapshot {
  generatedAt: string;
  decisions: ExecutiveMemoryEntry[];
  experiments: ExecutiveMemoryEntry[];
  lessons: ExecutiveMemoryEntry[];
  avoidSuggestions: string[];
  provenWins: string[];
}

export interface ExecutiveMorningBrief {
  generatedAt: string;
  biggestWin: string;
  biggestRevenueLeak: string;
  biggestOpportunity: string;
  actionsToday: { title: string; href: string; revenueImpact: number }[];
  risksToWatch: string[];
  goalsToday: string[];
  highestRoiRecommendation: PrioritizedRecommendation | null;
}

export interface IntelligenceSuite {
  generatedAt: string;
  revenueAttribution: RevenueAttributionFunnel;
  prioritizedRecommendations: PrioritizedRecommendation[];
  websiteHeat: WebsiteHeatIntelligence;
  booking: ExtendedBookingIntelligence;
  content: ContentIntelligenceSummary;
  clients: ClientIntelligenceSummary;
  financial: FinancialIntelligence;
  predictive: PredictiveInsight[];
  executiveMemory: ExecutiveMemorySnapshot;
  executiveMorning: ExecutiveMorningBrief;
}

export interface CRMContactIntelligence {
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagram: string;
    source: string;
    tags: string[];
    status: string;
    bookings: number;
    applications: number;
    contacts: number;
    revenue: number;
    lastActivity: string;
    notes?: string;
  };
  timeline: { id: string; type: string; status: string; label: string; detail: string; createdAt: string; href: string }[];
  bookingHistory: { id: string; status: string; service: string; budget: string; createdAt: string }[];
  conversationSummary: string;
  predictedLTV: number;
  bookingProbability: number;
  recommendedFollowUp: string;
  recommendedContactDate: string;
  upsells: string[];
  isInactive: boolean;
  daysSinceActivity: number;
  suggestedEmail: string;
  suggestedText: string;
  lastConversation: string;
  revenueGenerated: number;
  nextBestAction: string;
}

export interface BookingIntelligence {
  generatedAt: string;
  monthlyTrend: { month: string; count: number }[];
  busyMonths: string[];
  slowMonths: string[];
  revenueForecast: number;
  bookingForecast: number;
  /** Booking inquiries still in new/contacted status */
  pendingInquiries: number;
  /** Inquiries in new/contacted status untouched for 3+ days */
  staleInquiries: number;
  monthBookings: number;
  monthGrowth: number;
  abandonedBookings: { id: string; name: string; email: string; daysSince: number; href: string; status: string }[];
  pricingRecommendations: string[];
  promotions: string[];
  pipelineValue: number;
  conversionTrend: number;
  salesRecommendations: SalesRecommendation[];
}

export interface WebsiteOptimizationResult {
  generatedAt: string;
  overallScore: number;
  conversionRate: number;
  sections: {
    area: string;
    score: number;
    findings: string[];
    recommendations: string[];
  }[];
  aiSummary: string;
  provider: string;
}

export type AIReportType = "monthly" | "quarterly" | "yearly" | "sponsor" | "marketing" | "revenue" | "growth";

export interface AIReportResult {
  type: AIReportType;
  generatedAt: string;
  provider: string;
  content: string;
  data: Record<string, unknown>;
  /** Structured Executive Intelligence Report 2.0 when available */
  reportV2?: import("./platform/executive-report-v2").ExecutiveReportV2;
}

export interface AICommandResult {
  type: "navigate" | "search" | "draft" | "message";
  href?: string;
  message: string;
  label?: string;
  draft?: string;
  results?: { label: string; href: string; category: string }[];
  provider: string;
}

export interface AINotificationItem {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  metric: string;
}

export interface SessionApplicationRank {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  score: number;
  confidence: number;
  evaluatedAt: string;
  evaluationVersion: string;
  evaluationProvider: string;
  unknownInformationPenalty: number;
  /** Set when the AI evaluation for this applicant failed; the applicant is still listed. */
  evaluationError?: string;
  tier: "Exceptional" | "Elite" | "Excellent" | "Strong" | "Good" | "Average" | "Needs Review";
  recommendation: "Invite to Interview" | "Shortlist" | "Request Evidence" | "Review" | "Hold";
  summary: string;
  strengths: string[];
  weakness: string;
  badges: string[];
  riskLevel: "low" | "medium" | "high";
  /** Verified revenue only — never estimated. basis "insufficient" means no historical data exists. */
  expectedValue: {
    basis: "verified" | "insufficient";
    amount: number;
    low: number;
    high: number;
    confidence: number;
    rationale: string;
  };
  /** Comparative explanation of why this applicant sits at this position. */
  reasonForRank: string;
  /** Present when the position was decided by the tie-break chain against a near-equal applicant. */
  tieBreak: {
    comparedWith: string;
    decidedBy: string;
    detail: string;
    chain: string[];
  } | null;
  recommendedProject: string;
  categories: {
    key:
      | "portfolioQuality"
      | "brandAlignment"
      | "businessValue"
      | "versatility"
      | "professionalPresence"
      | "marketingImpact"
      | "experience"
      | "applicationQuality";
    label: string;
    score: number;
    maxScore: number;
    confidence: number;
    explanation: string;
    evidence: string[];
    missing: string[];
    improvements: string[];
  }[];
  predictions: {
    key:
      | "repeatBookings"
      | "premiumClientSuccess"
      | "referralPotential"
      | "upsellPotential"
      | "leadershipPotential"
      | "brandAmbassador"
      | "productionEfficiency"
      | "marketingImpact";
    label: string;
    probability: number;
    low: number;
    high: number;
    confidence: number;
  }[];
  dataQuality: {
    portfolio: "verified" | "provided" | "missing";
    social: "verified" | "provided" | "missing";
    availability: "confirmed" | "unknown";
    location: string;
    evidenceCount: number;
    missingFields: string[];
  };
  href: string;
  createdAt: string;
}

export interface PortfolioAnalysisResult {
  generatedAt: string;
  projectTitle: string;
  images: {
    url: string;
    index: number;
    suggestedHero: boolean;
    altText: string;
    description: string;
    blurry: boolean;
    duplicate: boolean;
    category: string;
  }[];
  heroRecommendation: string;
  duplicates: string[];
  blurryImages: string[];
  suggestedCategories: string[];
  homepagePlacement: string;
  instagramCarousel: string[];
  provider: string;
}

export type AIPageContext =
  | "dashboard"
  | "crm"
  | "crm_profile"
  | "bookings"
  | "pipeline"
  | "analytics"
  | "marketing"
  | "email"
  | "portfolio"
  | "sessions"
  | "applications"
  | "sponsorship"
  | "automations"
  | "reports"
  | "insights"
  | "intelligence"
  | "opportunities"
  | "risks"
  | "assistant"
  | "memory"
  | "general";

export interface AIContextPayload {
  page: AIPageContext;
  title?: string;
  data?: Record<string, unknown>;
}

export const PAGE_AI_PROMPTS: Record<AIPageContext, { label: string; prompts: string[] }> = {
  dashboard: {
    label: "Dashboard",
    prompts: ["What should I focus on today?", "Summarize this week's performance", "What are my top priorities?"],
  },
  crm: { label: "CRM", prompts: ["Find inactive clients", "Who are my VIP clients?", "Who needs follow-up?"] },
  crm_profile: {
    label: "Client Profile",
    prompts: ["Summarize this client", "Write a follow-up email", "Suggest upsells"],
  },
  bookings: { label: "Bookings", prompts: ["Detect abandoned bookings", "Recommend pricing", "Forecast next month"] },
  pipeline: { label: "Pipeline", prompts: ["What's stuck in pipeline?", "Which leads should I prioritize?"] },
  analytics: { label: "Analytics", prompts: ["Explain these numbers", "What's driving traffic?", "Where am I losing conversions?"] },
  marketing: { label: "Marketing", prompts: ["Create Instagram campaign", "Write newsletter", "Launch campaign idea"] },
  email: { label: "Email", prompts: ["Improve this campaign", "Write subject lines", "Re-engagement email"] },
  portfolio: { label: "Portfolio", prompts: ["Pick hero images", "Generate alt text", "Suggest homepage placement"] },
  sessions: { label: "Sessions", prompts: ["Summarize applications", "Create shoot checklist", "Draft acceptance email"] },
  applications: { label: "Applications", prompts: ["Rank applications", "Summarize top applicants", "Draft rejection emails"] },
  sponsorship: { label: "Sponsorship", prompts: ["Generate sponsor report", "Highlight audience growth"] },
  automations: { label: "Automations", prompts: ["Create portrait client workflow", "Booking reminder automation"] },
  reports: { label: "Reports", prompts: ["Generate monthly report", "Revenue forecast", "Marketing report"] },
  insights: { label: "Insights", prompts: ["What actions matter most?", "Explain today's insights"] },
  intelligence: {
    label: "Executive Intelligence",
    prompts: ["What is my highest ROI action today?", "What risks should I address first?", "Explain my business health scores"],
  },
  opportunities: {
    label: "Opportunities",
    prompts: ["Rank opportunities by revenue", "What should I execute this week?"],
  },
  risks: { label: "Risk Center", prompts: ["What could hurt revenue this month?", "Show early warning signals"] },
  assistant: { label: "Executive Intelligence", prompts: ["What is the highest-ROI action today?", "Where are we losing revenue?", "Summarize north star metrics"] },
  memory: {
    label: "Knowledge Engine",
    prompts: [
      "What does the cognitive architecture know about my business?",
      "What changed in the last executive intelligence refresh?",
      "What unknowns should I resolve first?",
      "Simulate increasing pricing 15% — what happens?",
    ],
  },
  general: { label: "Admin", prompts: ["What should I focus on today?", "Show me revenue", "Find inactive clients"] },
};
