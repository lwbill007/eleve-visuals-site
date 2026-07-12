/**
 * Known source profiles + competitive / trend / opportunity scaffolds.
 * Profiles are catalog metadata — not live fetch results.
 */

import type {
  CompetitorMonitorSegment,
  CompetitiveIntelligenceSection,
  DetectedTrend,
  ResearchMode,
  ResearchCostEstimate,
  SourceProfile,
  StrategicOpportunity,
  EvidenceTimelineEvent,
  SelfCritique,
  BusinessRelevanceResult,
} from "./types";
import { RESEARCH_MODE_META } from "./types";
import { SOURCE_RELIABILITY_CATALOG } from "../reasoning/source-reliability";

function trustFromReliability(id: string, fallback: number): number {
  return SOURCE_RELIABILITY_CATALOG.find((s) => s.id === id)?.trustScore ?? fallback;
}

export const SOURCE_PROFILE_CATALOG: SourceProfile[] = [
  {
    id: "google-search-central",
    name: "Google Search Central",
    category: "Official Documentation",
    authority: 100,
    freshnessLabel: "Daily / continuous",
    trust: trustFromReliability("google-search-central", 99),
    bias: "Very Low",
    tier: "highest",
    notes: "Primary SEO / indexing authority",
  },
  {
    id: "meta-developers",
    name: "Meta / Instagram Developers",
    category: "Platform Documentation",
    authority: 95,
    freshnessLabel: "Weekly+",
    trust: trustFromReliability("meta-developers", 92),
    bias: "Low",
    tier: "highest",
    notes: "Official platform changes — not marketing blogs",
  },
  {
    id: "w3c-wai",
    name: "W3C WAI / WCAG",
    category: "Standards Organization",
    authority: 100,
    freshnessLabel: "Standards cadence",
    trust: trustFromReliability("w3c-wai", 99),
    bias: "Very Low",
    tier: "highest",
    notes: "Accessibility standards",
  },
  {
    id: "nextjs-docs",
    name: "Next.js Documentation",
    category: "Official Documentation",
    authority: 95,
    freshnessLabel: "Release-tied",
    trust: trustFromReliability("nextjs-docs", 95),
    bias: "Low",
    tier: "highest",
    notes: "Framework truth for ÉLEVÉ stack",
  },
  {
    id: "baymard",
    name: "Baymard Institute",
    category: "Industry Research",
    authority: 88,
    freshnessLabel: "Study refresh cycles",
    trust: trustFromReliability("baymard", 86),
    bias: "Low",
    tier: "second",
    notes: "Strong UX research; not ÉLEVÉ-specific — expires ~90 days",
  },
  {
    id: "stripe-docs",
    name: "Stripe Documentation",
    category: "Official Documentation",
    authority: 95,
    freshnessLabel: "Release-tied",
    trust: 95,
    bias: "Low",
    tier: "highest",
    notes: "Payments / compliance-adjacent",
  },
  {
    id: "ftc",
    name: "FTC Guidance",
    category: "Government",
    authority: 98,
    freshnessLabel: "As published",
    trust: 97,
    bias: "Very Low",
    tier: "highest",
    notes: "Advertising / endorsement compliance",
  },
];

export function buildCompetitiveSection(connectorWired: boolean): CompetitiveIntelligenceSection {
  const status = connectorWired ? "watching" : "no_connector";
  const note = connectorWired
    ? "Public pages only — never scrape private data; identify opportunities, never copy."
    : "Segments defined — live competitor scans blocked until web connector is wired.";

  const segments: CompetitorMonitorSegment[] = [
    {
      id: "luxury",
      label: "Luxury Studios",
      track: ["Website updates", "Pricing", "Packages", "Portfolio", "Brand positioning", "Campaigns"],
      status,
      note,
    },
    {
      id: "editorial",
      label: "Editorial Studios",
      track: ["Portfolio", "Brand positioning", "Technology adoption", "Campaigns"],
      status,
      note,
    },
    {
      id: "commercial",
      label: "Commercial Studios",
      track: ["Services", "Packages", "Marketing", "SEO"],
      status,
      note,
    },
    {
      id: "agencies",
      label: "Creative Agencies",
      track: ["Positioning", "Services", "Campaigns", "Technology adoption"],
      status,
      note,
    },
    {
      id: "photo-brands",
      label: "Photography Brands",
      track: ["Product drops", "Campaigns", "Partnerships"],
      status,
      note,
    },
  ];

  return {
    segments,
    findings: connectorWired
      ? []
      : ["No live competitor findings — connector offline. Do not invent competitor pricing or packages."],
    opportunities: connectorWired
      ? []
      : ["Opportunity detection awaits verified public scans — refuse fabricated market shares."],
    principle: "Never copy competitors. Always identify opportunities from public information only.",
  };
}

export function detectTrendsFromQuery(
  query: string,
  relevance: BusinessRelevanceResult,
  connectorWired: boolean
): DetectedTrend[] {
  if (!relevance.relevant || relevance.ignoredAsNoise) return [];

  const trends: DetectedTrend[] = [];
  if (/\b(ai search|sge|ai.?overview|generative search)\b/i.test(query)) {
    trends.push({
      id: "trend-ai-search",
      name: "AI Search",
      momentum: "Growing",
      importance: "High",
      affects: ["seo", "marketing"],
      confidence: connectorWired ? 70 : 40,
      recommendation:
        "Optimize key pages for clarity and structured answers — verify against official Search Central guidance before execution.",
      truthKind: connectorWired ? "AI Analysis" : "Unknown (More Data Required)",
      evidenceNote: connectorWired
        ? "Requires multi-source corroboration from official docs + independent analysis"
        : "Trend hypothesis only — no live sources fetched",
    });
  }
  if (/\b(instagram algorithm|reach|distribution)\b/i.test(query)) {
    trends.push({
      id: "trend-ig-reach",
      name: "Instagram distribution / reach",
      momentum: "Unknown",
      importance: "High",
      affects: ["marketing", "bookings"],
      confidence: connectorWired ? 65 : 35,
      recommendation:
        "Alert marketing if official Meta guidance confirms reach changes — ignore cosmetic UI noise.",
      truthKind: connectorWired ? "AI Analysis" : "Unknown (More Data Required)",
      evidenceNote: "Prefer Meta official docs over influencer blogs",
    });
  }
  return trends;
}

export function estimateResearchCost(
  mode: ResearchMode,
  justified: boolean,
  justification: string
): ResearchCostEstimate {
  const meta = RESEARCH_MODE_META[mode];
  return {
    mode,
    label: meta.label,
    estimatedSeconds: meta.estimatedSeconds,
    justified,
    justification,
  };
}

export function buildOpportunityScaffolds(
  query: string,
  connectorWired: boolean
): StrategicOpportunity[] {
  const opps: StrategicOpportunity[] = [];
  if (/\b(retainer|membership|subscription|annual)\b/i.test(query)) {
    opps.push({
      id: "opp-membership",
      title: "Evaluate an ÉLEVÉ Membership / annual retainer",
      marketAdoption: "Unknown",
      competition: "Unknown",
      estimatedFit: "Unknown",
      recommendation:
        "Do not assume market adoption. Validate with internal client history first; then gated public competitive scan.",
      truthKind: "Unknown (More Data Required)",
      evidenceNote: connectorWired
        ? "Requires verified public package pages + internal LTV"
        : "Connector offline — opportunity flagged qualitatively only",
    });
  }
  return opps;
}

export function buildEvidenceTimeline(input: {
  query: string;
  status: string;
}): EvidenceTimelineEvent[] {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  return [
    {
      id: "tl-prior",
      period: "Prior",
      event: "No verified external research stored for this query yet",
      kind: "none",
      truthKind: "Unknown (More Data Required)",
    },
    {
      id: "tl-now",
      period: month,
      event:
        input.status === "completed"
          ? "Research run completed with cited sources"
          : `Research run status: ${input.status}`,
      kind: input.status === "completed" ? "external" : "none",
      truthKind: input.status === "completed" ? "Verified External Research" : "AI Analysis",
    },
  ];
}

export function buildSelfCritique(input: {
  unknowns: string[];
  singleSource: boolean;
  connectorAvailable: boolean;
  recommendations: string[];
}): SelfCritique {
  return {
    whatCouldMakeThisWrong: [
      input.connectorAvailable
        ? "Official guidance may have changed since last fetch"
        : "No live sources were fetched — any external claim would be speculation",
      input.singleSource ? "Single-source bias" : "Incomplete multi-source coverage",
      "ÉLEVÉ-specific client mix may not match industry patterns",
    ],
    missingData: input.unknowns.length
      ? input.unknowns
      : ["Publication dates", "Independent corroboration", "Internal before/after outcomes"],
    alternativeExplanations: [
      "Observed pattern is seasonal, not structural",
      "Traffic/booking shift driven by offer or ops, not the researched trend",
      "Source consensus reflects vendor marketing rather than measured outcomes",
    ],
    evidenceToIncreaseConfidence: [
      "Second independent verified source",
      "Official documentation citation with date",
      "Internal analytics aligning with the recommendation",
      "Historical outcome from a similar ÉLEVÉ decision",
    ],
    verifyBeforeExecution: [
      "Confirm recommendation against measured CRM/booking/analytics",
      "Human approval for any client-facing or technical change",
      ...(input.recommendations[0]
        ? [`Re-read: ${input.recommendations[0].slice(0, 120)}`]
        : []),
    ],
  };
}
