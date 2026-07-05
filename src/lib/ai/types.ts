export type AIProviderId = "openrouter" | "ollama";

export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
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
}

export interface AICompletionResult {
  content: string;
  toolCalls?: AIToolCall[];
  finishReason: "stop" | "tool_calls" | "error";
  provider: AIProviderId;
  model: string;
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
}

export interface ExecutiveRisk {
  id: string;
  title: string;
  detail: string;
  why: string;
  category: "revenue" | "marketing" | "sales" | "operations" | "technical" | "crm" | "sessions";
  severity: "critical" | "high" | "medium" | "low";
  likelihood: number;
  potentialImpact: number;
  evidence: string[];
  mitigations: BusinessAction[];
  detectedAt: string;
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
  summary: string;
  strengths: string[];
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
  assistant: { label: "Assistant", prompts: ["What should I focus on today?", "Summarize the business"] },
  memory: {
    label: "Business Knowledge Engine",
    prompts: [
      "What does the AI know about my business?",
      "What changed in the last knowledge refresh?",
      "Which pages drive the most bookings?",
    ],
  },
  general: { label: "Admin", prompts: ["What should I focus on today?", "Show me revenue", "Find inactive clients"] },
};
