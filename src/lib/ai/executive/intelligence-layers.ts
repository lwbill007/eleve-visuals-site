/**
 * Fifteen intelligence layers for multi-dimensional business analysis.
 * Used during platform scans, refresh, and executive synthesis.
 */

export type IntelligenceLayerId =
  | "business_structure"
  | "technical_performance"
  | "ux"
  | "accessibility"
  | "seo"
  | "content_quality"
  | "brand_consistency"
  | "marketing_effectiveness"
  | "sales_funnel"
  | "crm_health"
  | "revenue_intelligence"
  | "creative_quality"
  | "customer_experience"
  | "competitive_positioning"
  | "executive_opportunities";

export interface IntelligenceLayer {
  id: IntelligenceLayerId;
  index: number;
  label: string;
  description: string;
  analyzes: string[];
}

export const INTELLIGENCE_LAYERS: IntelligenceLayer[] = [
  {
    id: "business_structure",
    index: 1,
    label: "Business Structure",
    description: "Services, pricing, offers, and how the business model connects",
    analyzes: ["services", "pricing", "offers", "revenue streams", "sessions model"],
  },
  {
    id: "technical_performance",
    index: 2,
    label: "Technical Performance",
    description: "Page speed, Core Web Vitals, infrastructure health",
    analyzes: ["load time", "performance", "errors", "uptime"],
  },
  {
    id: "ux",
    index: 3,
    label: "UX",
    description: "Navigation, flow, friction, and conversion paths",
    analyzes: ["navigation", "booking flow", "CTAs", "mobile experience"],
  },
  {
    id: "accessibility",
    index: 4,
    label: "Accessibility",
    description: "WCAG compliance, alt text, keyboard navigation",
    analyzes: ["alt text", "contrast", "aria", "form labels"],
  },
  {
    id: "seo",
    index: 5,
    label: "SEO",
    description: "Metadata, schema, internal links, discoverability",
    analyzes: ["meta tags", "JSON-LD", "canonical", "sitemap", "internal links"],
  },
  {
    id: "content_quality",
    index: 6,
    label: "Content Quality",
    description: "Copy depth, clarity, storytelling, and completeness",
    analyzes: ["copy", "headlines", "descriptions", "blog", "policies"],
  },
  {
    id: "brand_consistency",
    index: 7,
    label: "Brand Consistency",
    description: "Tone, visual identity, luxury positioning across touchpoints",
    analyzes: ["tone", "visual identity", "voice", "luxury perception"],
  },
  {
    id: "marketing_effectiveness",
    index: 8,
    label: "Marketing Effectiveness",
    description: "Campaigns, channels, hooks, and channel ROI",
    analyzes: ["instagram", "email", "ads", "landing pages", "campaigns"],
  },
  {
    id: "sales_funnel",
    index: 9,
    label: "Sales Funnel",
    description: "Inquiry → consultation → booking → close pipeline",
    analyzes: ["inquiries", "pipeline", "conversion", "abandonment"],
  },
  {
    id: "crm_health",
    index: 10,
    label: "CRM Health",
    description: "Client relationships, follow-ups, retention, LTV",
    analyzes: ["contacts", "follow-ups", "inactive clients", "referrals"],
  },
  {
    id: "revenue_intelligence",
    index: 11,
    label: "Revenue Intelligence",
    description: "Revenue, profit, APV, forecasts, seasonality",
    analyzes: ["revenue", "profit", "APV", "forecast", "seasonality"],
  },
  {
    id: "creative_quality",
    index: 12,
    label: "Creative Quality",
    description: "Portfolio strength, session volumes, visual storytelling",
    analyzes: ["portfolio", "sessions", "imagery", "hero placement"],
  },
  {
    id: "customer_experience",
    index: 13,
    label: "Customer Experience",
    description: "End-to-end client journey from discovery to delivery",
    analyzes: ["booking experience", "galleries", "testimonials", "support"],
  },
  {
    id: "competitive_positioning",
    index: 14,
    label: "Competitive Positioning",
    description: "Market position, differentiation, premium perception",
    analyzes: ["positioning", "pricing vs market", "brand differentiation"],
  },
  {
    id: "executive_opportunities",
    index: 15,
    label: "Executive Opportunities",
    description: "Ranked opportunities with revenue impact and confidence",
    analyzes: ["opportunities", "revenue leaks", "experiments", "priorities"],
  },
];

export function layerById(id: IntelligenceLayerId): IntelligenceLayer {
  return INTELLIGENCE_LAYERS.find((l) => l.id === id) ?? INTELLIGENCE_LAYERS[0];
}

export function formatLayersForPrompt(): string {
  return INTELLIGENCE_LAYERS.map((l) => `Layer ${l.index}: ${l.label} — ${l.description}`).join("\n");
}
