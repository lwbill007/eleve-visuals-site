import type { GraphHealth, IntegrationTruthSource } from "./types";

export function computeGraphHealth(nodes: number, edges: number): GraphHealth {
  const targetEdges = Math.max(500, Math.round(nodes * 0.5));
  const density = nodes > 0 ? edges / nodes : 0;
  const edgeProgress = Math.min(1, edges / targetEdges);
  const healthScore = Math.round(edgeProgress * 100);

  let status: GraphHealth["status"] = "healthy";
  if (healthScore < 30) status = "critical";
  else if (healthScore < 70) status = "under_connected";

  return {
    nodes,
    edges,
    density: Math.round(density * 100) / 100,
    targetEdges,
    healthScore,
    status,
    explanation:
      status === "healthy"
        ? `${edges} relationships across ${nodes} knowledge objects — graph supports traceability`
        : status === "under_connected"
          ? `Only ${edges} edges for ${nodes} nodes (target ${targetEdges}). Run Refresh Executive Intelligence to strengthen links.`
          : `Critical: ${edges} edges for ${nodes} memories — recommendations lack relationship evidence`,
    recentLinks: [],
  };
}

export function getIntegrationTruthSources(): IntegrationTruthSource[] {
  const now = new Date().toISOString();
  const check = (env: string) => Boolean(process.env[env]?.trim());

  return [
    {
      id: "analytics",
      label: "First-party Analytics",
      connected: true,
      status: "verified",
      evidenceTable: "AnalyticsEvent",
      lastSync: now,
      blocksDecisions: [],
    },
    {
      id: "ga4",
      label: "Google Analytics 4",
      connected: check("GA4_PROPERTY_ID") || check("GOOGLE_ANALYTICS_ID"),
      status: check("GA4_PROPERTY_ID") ? "verified" : "missing",
      blocksDecisions: ["Channel ROI", "Audience demographics"],
    },
    {
      id: "search-console",
      label: "Google Search Console",
      connected: check("GOOGLE_SEARCH_CONSOLE_KEY"),
      status: check("GOOGLE_SEARCH_CONSOLE_KEY") ? "verified" : "missing",
      blocksDecisions: ["Keyword strategy", "Organic forecasts"],
    },
    {
      id: "instagram",
      label: "Instagram Business",
      connected: check("INSTAGRAM_ACCESS_TOKEN"),
      status: check("INSTAGRAM_ACCESS_TOKEN") ? "verified" : "missing",
      blocksDecisions: ["Content performance", "Reach forecasts"],
    },
    {
      id: "meta-ads",
      label: "Meta Ads",
      connected: check("META_ADS_TOKEN"),
      status: check("META_ADS_TOKEN") ? "verified" : "missing",
      blocksDecisions: ["Paid CAC", "Ad ROAS"],
    },
    {
      id: "stripe",
      label: "Stripe",
      connected: check("STRIPE_SECRET_KEY"),
      status: check("STRIPE_SECRET_KEY") ? "verified" : "missing",
      evidenceTable: "Submission (proxy until Invoice table)",
      blocksDecisions: ["Verified revenue", "Cash flow"],
    },
    {
      id: "email",
      label: "Email (Resend/SendGrid)",
      connected: check("RESEND_API_KEY") || check("SENDGRID_API_KEY"),
      status: check("RESEND_API_KEY") ? "verified" : "missing",
      blocksDecisions: ["Campaign attribution"],
    },
    {
      id: "clarity",
      label: "Microsoft Clarity",
      connected: check("CLARITY_PROJECT_ID"),
      status: check("CLARITY_PROJECT_ID") ? "verified" : "missing",
      blocksDecisions: ["UX heatmaps", "Session replay"],
    },
  ];
}
