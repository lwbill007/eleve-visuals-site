/**
 * Principle #4 — External Intelligence connectors
 * Real integrations expose health; disconnected = degraded intelligence, not invented data.
 */

import type { TruthLabel } from "./truth-metadata";

export type ConnectorId =
  | "analytics"
  | "ga4"
  | "search_console"
  | "clarity"
  | "instagram"
  | "meta_ads"
  | "stripe"
  | "resend"
  | "github"
  | "vercel"
  | "cloudinary"
  | "neon"
  | "google_business"
  | "calendar"
  | "crm"
  | "booking_platform";

export interface ConnectorHealth {
  id: ConnectorId;
  label: string;
  connected: boolean;
  health: "healthy" | "degraded" | "disconnected" | "error";
  syncStatus: "live" | "stale" | "never" | "error";
  lastUpdate?: string;
  coverage: number;
  confidence: number;
  truthLabel: TruthLabel;
  unknownFields: string[];
  missingPermissions: string[];
  errors: string[];
  blocksDecisions: string[];
  evidenceTable?: string;
}

function env(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

const CONNECTOR_DEFS: Omit<
  ConnectorHealth,
  "connected" | "health" | "syncStatus" | "lastUpdate" | "coverage" | "confidence" | "truthLabel" | "errors"
>[] = [
  {
    id: "analytics",
    label: "First-party Analytics",
    unknownFields: [],
    missingPermissions: [],
    blocksDecisions: [],
    evidenceTable: "AnalyticsEvent",
  },
  {
    id: "ga4",
    label: "Google Analytics 4",
    unknownFields: ["demographics", "realtime", "channel_groups"],
    missingPermissions: env("GA4_PROPERTY_ID") ? [] : ["GA4_PROPERTY_ID or service account"],
    blocksDecisions: ["Channel ROI", "Audience demographics", "Landing page performance"],
  },
  {
    id: "search_console",
    label: "Google Search Console",
    unknownFields: ["keywords", "impressions", "ctr", "position"],
    missingPermissions: env("GOOGLE_SEARCH_CONSOLE_KEY") ? [] : ["GOOGLE_SEARCH_CONSOLE_KEY"],
    blocksDecisions: ["Keyword strategy", "Organic forecasts", "Index coverage"],
  },
  {
    id: "clarity",
    label: "Microsoft Clarity",
    unknownFields: ["heatmaps", "session_recordings", "rage_clicks"],
    missingPermissions: env("CLARITY_PROJECT_ID") ? [] : ["CLARITY_PROJECT_ID"],
    blocksDecisions: ["UX friction diagnosis", "Form abandonment analysis"],
  },
  {
    id: "instagram",
    label: "Instagram Business",
    unknownFields: ["reach", "saves", "profile_visits", "reel_plays"],
    missingPermissions: env("INSTAGRAM_ACCESS_TOKEN") ? [] : ["INSTAGRAM_ACCESS_TOKEN"],
    blocksDecisions: ["Content performance", "Reach forecasts", "Reel ROI"],
  },
  {
    id: "meta_ads",
    label: "Meta Ads",
    unknownFields: ["spend", "cpc", "roas", "conversions"],
    missingPermissions: env("META_ADS_TOKEN") ? [] : ["META_ADS_TOKEN"],
    blocksDecisions: ["Paid CAC", "Ad ROAS", "Campaign attribution"],
  },
  {
    id: "stripe",
    label: "Stripe",
    unknownFields: ["mrr", "subscriptions"],
    missingPermissions: [
      ...(!env("STRIPE_SECRET_KEY") ? ["STRIPE_SECRET_KEY"] : []),
      ...(!env("STRIPE_WEBHOOK_SECRET") ? ["STRIPE_WEBHOOK_SECRET"] : []),
    ],
    blocksDecisions: ["Verified revenue", "Cash flow", "LTV"],
    evidenceTable: "Payment",
  },
  {
    id: "resend",
    label: "Resend Email",
    unknownFields: ["open_rate", "click_rate", "campaign_attribution"],
    missingPermissions: env("RESEND_API_KEY") ? [] : ["RESEND_API_KEY"],
    blocksDecisions: ["Email campaign ROI"],
  },
  {
    id: "github",
    label: "GitHub",
    unknownFields: ["deployments", "commits"],
    missingPermissions: env("GITHUB_TOKEN") ? [] : ["GITHUB_TOKEN"],
    blocksDecisions: ["Deploy-triggered intelligence"],
  },
  {
    id: "vercel",
    label: "Vercel",
    unknownFields: ["deployments", "edge_logs"],
    missingPermissions: [],
    blocksDecisions: ["Post-deploy QA automation"],
  },
  {
    id: "cloudinary",
    label: "Cloudinary",
    unknownFields: ["asset_usage", "transformations"],
    missingPermissions: env("CLOUDINARY_URL") ? [] : ["CLOUDINARY_URL"],
    blocksDecisions: ["Media delivery analytics"],
  },
  {
    id: "neon",
    label: "Neon Database",
    unknownFields: [],
    missingPermissions: env("DATABASE_URL") ? [] : ["DATABASE_URL"],
    blocksDecisions: ["All intelligence"],
    evidenceTable: "PostgreSQL via Prisma",
  },
  {
    id: "google_business",
    label: "Google Business Profile",
    unknownFields: ["reviews", "local_searches", "directions"],
    missingPermissions: env("GOOGLE_BUSINESS_TOKEN") ? [] : ["GOOGLE_BUSINESS_TOKEN"],
    blocksDecisions: ["Local SEO", "Review intelligence"],
  },
  {
    id: "calendar",
    label: "Calendar",
    unknownFields: ["availability", "booked_slots"],
    missingPermissions: env("GOOGLE_CALENDAR_TOKEN") ? [] : ["GOOGLE_CALENDAR_TOKEN"],
    blocksDecisions: ["Capacity planning", "Scheduling optimization"],
  },
  {
    id: "crm",
    label: "CRM (internal)",
    unknownFields: [],
    missingPermissions: [],
    blocksDecisions: [],
    evidenceTable: "Submission + CRM contacts",
  },
  {
    id: "booking_platform",
    label: "Booking Platform (internal)",
    unknownFields: [],
    missingPermissions: [],
    blocksDecisions: [],
    evidenceTable: "Submission",
  },
];

function resolveConnector(def: (typeof CONNECTOR_DEFS)[number]): ConnectorHealth {
  const now = new Date().toISOString();

  let connected = false;
  switch (def.id) {
    case "analytics":
    case "crm":
    case "booking_platform":
    case "neon":
    case "vercel":
      connected = true;
      break;
    case "ga4":
      connected = env("GA4_PROPERTY_ID") || env("GOOGLE_ANALYTICS_ID");
      break;
    case "search_console":
      connected = env("GOOGLE_SEARCH_CONSOLE_KEY");
      break;
    case "clarity":
      connected = env("CLARITY_PROJECT_ID");
      break;
    case "instagram":
      connected = env("INSTAGRAM_ACCESS_TOKEN");
      break;
    case "meta_ads":
      connected = env("META_ADS_TOKEN");
      break;
    case "stripe":
      connected = env("STRIPE_SECRET_KEY") && env("STRIPE_WEBHOOK_SECRET");
      break;
    case "resend":
      connected = env("RESEND_API_KEY");
      break;
    case "github":
      connected = env("GITHUB_TOKEN");
      break;
    case "cloudinary":
      connected = env("CLOUDINARY_URL");
      break;
    case "google_business":
      connected = env("GOOGLE_BUSINESS_TOKEN");
      break;
    case "calendar":
      connected = env("GOOGLE_CALENDAR_TOKEN");
      break;
  }

  const hasLiveApi =
    def.id === "analytics" ||
    def.id === "crm" ||
    def.id === "booking_platform" ||
    def.id === "neon" ||
    def.id === "resend" ||
    def.id === "stripe";

  const health: ConnectorHealth["health"] = !connected
    ? "disconnected"
    : hasLiveApi
      ? "healthy"
      : "degraded";

  const syncStatus: ConnectorHealth["syncStatus"] = !connected
    ? "never"
    : hasLiveApi
      ? "live"
      : "stale";

  const coverage = connected ? (hasLiveApi ? 1 : 0.15) : 0;
  const confidence = connected ? (hasLiveApi ? 0.9 : 0.2) : 0;
  const truthLabel: TruthLabel = hasLiveApi ? "verified" : connected ? "unknown" : "unknown";

  return {
    ...def,
    connected,
    health,
    syncStatus,
    lastUpdate: connected ? now : undefined,
    coverage,
    confidence,
    truthLabel,
    errors:
      health === "degraded"
        ? [`${def.label}: env configured but no live API sync — intelligence will not invent data`]
        : health === "disconnected"
          ? [`${def.label}: not connected`]
          : [],
  };
}

export function getConnectorHealth(): ConnectorHealth[] {
  return CONNECTOR_DEFS.map(resolveConnector);
}

export function getDisconnectedBlockers(): string[] {
  const blockers = new Set<string>();
  for (const c of getConnectorHealth()) {
    if (c.health !== "healthy") {
      for (const b of c.blocksDecisions) blockers.add(b);
    }
  }
  return [...blockers];
}

export function intelligenceDegraded(): boolean {
  return getConnectorHealth().some((c) => c.id !== "vercel" && c.health !== "healthy" && c.blocksDecisions.length > 0);
}
