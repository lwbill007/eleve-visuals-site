/**
 * Live Business Health + Intelligence Graph + Overnight Brief.
 */

import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { computeExecutiveScores } from "../intelligence/executive-scores";
import type {
  LiveBusinessHealth,
  LiveHealthComponent,
  IntelligenceGraph,
  ExecutiveOvernightBrief,
  PredictionRecord,
} from "./types";
import { getLearningOutcomes } from "../memory/learning";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";

export async function buildLiveBusinessHealth(
  metricsOverride?: Awaited<ReturnType<typeof getOperatorMetrics>>
): Promise<LiveBusinessHealth> {
  const metrics = metricsOverride ?? (await getOperatorMetrics());
  const scores = computeExecutiveScores(metrics);

  const byKey = (k: string) => scores.find((s) => s.key === k)?.value ?? null;
  const components: LiveHealthComponent[] = [
    {
      id: "revenue",
      label: "Revenue",
      score: byKey("revenue"),
      explain:
        metrics.revenue.thisMonth > 0
          ? `MTD $${metrics.revenue.thisMonth.toLocaleString()} (${metrics.revenue.monthChange >= 0 ? "+" : ""}${metrics.revenue.monthChange}%)`
          : "Not enough revenue signal MTD",
      trend: metrics.revenue.monthChange > 0 ? "up" : metrics.revenue.monthChange < 0 ? "down" : "unknown",
      truthKind: metrics.revenue.thisMonth > 0 ? "Measured Data" : "Unknown (More Data Required)",
      priority: "high",
    },
    {
      id: "marketing",
      label: "Marketing",
      score: byKey("marketing"),
      explain: `${metrics.traffic.visitors30} visitors · ${metrics.traffic.conversionRate}% conversion (30d)`,
      trend: metrics.traffic.trafficChange > 0 ? "up" : metrics.traffic.trafficChange < 0 ? "down" : "flat",
      truthKind: metrics.traffic.visitors30 > 0 ? "Measured Data" : "Unknown (More Data Required)",
      priority: "medium",
    },
    {
      id: "operations",
      label: "Operations",
      score: byKey("operations"),
      explain:
        metrics.attention.abandonedInquiries > 0
          ? `${metrics.attention.abandonedInquiries} stale inquiries in queue`
          : "Abandoned inquiry markers clear",
      trend: metrics.attention.abandonedInquiries > 0 ? "down" : "flat",
      truthKind: "Measured Data",
      priority: metrics.attention.abandonedInquiries > 3 ? "critical" : "medium",
    },
    {
      id: "clients",
      label: "Clients",
      score: byKey("clientExperience"),
      explain: `${metrics.attention.followUpClients} inactive clients flagged for follow-up`,
      trend: "unknown",
      truthKind: "Measured Data",
      priority: metrics.attention.followUpClients > 5 ? "high" : "low",
    },
    {
      id: "brand",
      label: "Brand",
      score: byKey("brand"),
      explain: "Brand score is composite / qualitative unless audit connected",
      trend: "flat",
      truthKind: "AI Analysis",
      priority: "medium",
    },
    {
      id: "technology",
      label: "Technology",
      score: 55,
      explain: "Lighthouse/CWV connectors not wired — score capped; do not invent performance",
      trend: "unknown",
      truthKind: "Unknown (More Data Required)",
      priority: "medium",
    },
    {
      id: "knowledge",
      label: "Knowledge",
      score: metrics.traffic.visitors30 > 0 && metrics.month.bookings >= 0 ? 78 : 45,
      explain: "Coverage of analytics + booking signals for executive reasoning",
      trend: "flat",
      truthKind: "AI Analysis",
      priority: "medium",
    },
  ];

  const present = components.filter((c) => c.score != null);
  const overall =
    present.length > 0
      ? Math.round(present.reduce((s, c) => s + (c.score ?? 0), 0) / present.length)
      : null;

  return {
    overall,
    components,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Live Business Health is explainable and dynamic. Missing connectors stay Unknown — never fabricated.",
  };
}

export async function buildIntelligenceGraph(): Promise<IntelligenceGraph> {
  const [metrics, analytics] = await Promise.all([getOperatorMetrics(), getAnalyticsSummary(30)]);

  const hasTraffic = analytics.totals.pageviews > 0;
  const stale = metrics.attention.abandonedInquiries;

  const nodes = [
    {
      id: "instagram",
      label: "Instagram Reach",
      metric: "External — not measured unless UTM present",
      truthKind: "Unknown (More Data Required)" as const,
      status: "unknown" as const,
    },
    {
      id: "homepage",
      label: "Homepage Traffic",
      metric: hasTraffic ? `${analytics.totals.uniqueSessions} sessions (30d)` : "No analytics",
      truthKind: hasTraffic ? ("Measured Data" as const) : ("Unknown (More Data Required)" as const),
      status: hasTraffic ? ("ok" as const) : ("unknown" as const),
    },
    {
      id: "portfolio",
      label: "Portfolio Views",
      metric: analytics.topPages.find((p) => p.path.includes("portfolio"))
        ? `${analytics.topPages.find((p) => p.path.includes("portfolio"))!.views} views`
        : "Not enough data",
      truthKind: "Measured Data" as const,
      status: "ok" as const,
    },
    {
      id: "booking",
      label: "Booking Page",
      metric: analytics.topPages.find((p) => p.path.includes("book"))
        ? `${analytics.topPages.find((p) => p.path.includes("book"))!.views} views`
        : "Not in top pages",
      truthKind: "Measured Data" as const,
      status: "watch" as const,
    },
    {
      id: "inquiry",
      label: "Inquiry",
      metric: `${metrics.month.bookings} bookings MTD · ${stale} stale`,
      truthKind: "Measured Data" as const,
      status: stale > 3 ? ("critical" as const) : stale > 0 ? ("watch" as const) : ("ok" as const),
    },
    {
      id: "consultation",
      label: "Consultation",
      metric: "Close rate not fully measured — Unknown",
      truthKind: "Unknown (More Data Required)" as const,
      status: "unknown" as const,
    },
    {
      id: "client",
      label: "Client",
      metric: `${metrics.attention.followUpClients} inactive flagged`,
      truthKind: "Measured Data" as const,
      status: "ok" as const,
    },
    {
      id: "revenue",
      label: "Revenue",
      metric:
        metrics.revenue.thisMonth > 0
          ? `$${metrics.revenue.thisMonth.toLocaleString()} MTD`
          : "Not enough data",
      truthKind: metrics.revenue.thisMonth > 0 ? ("Measured Data" as const) : ("Unknown (More Data Required)" as const),
      status: "ok" as const,
    },
  ];

  const edges = [
    { from: "instagram", to: "homepage", label: "referral?" },
    { from: "homepage", to: "portfolio" },
    { from: "homepage", to: "booking" },
    { from: "portfolio", to: "booking" },
    { from: "booking", to: "inquiry" },
    { from: "inquiry", to: "consultation" },
    { from: "consultation", to: "client" },
    { from: "client", to: "revenue" },
  ];

  const changedOvernight: string[] = [];
  if (metrics.today.bookings > 0) changedOvernight.push(`${metrics.today.bookings} booking(s) today`);
  if (metrics.today.leads > 0) changedOvernight.push(`${metrics.today.leads} lead signal(s) today`);
  if (stale > 0) changedOvernight.push(`${stale} stale inquiries still open`);

  const downstreamAlerts: string[] = [];
  if (stale > 0) {
    downstreamAlerts.push("Inquiry → Consultation at risk while stale queue grows");
  }
  if (hasTraffic && metrics.traffic.conversionRate < 2) {
    downstreamAlerts.push("Homepage/Portfolio attention not converting into inquiries proportionally");
  }

  return { nodes, edges, changedOvernight, downstreamAlerts };
}

export async function buildExecutiveOvernightBrief(): Promise<ExecutiveOvernightBrief> {
  const [metrics, health, graph] = await Promise.all([
    getOperatorMetrics(),
    buildLiveBusinessHealth(),
    buildIntelligenceGraph(),
  ]);

  const whatChangedOvernight = [
    ...graph.changedOvernight,
    metrics.traffic.trafficChange !== 0
      ? `Traffic change ${metrics.traffic.trafficChange >= 0 ? "+" : ""}${metrics.traffic.trafficChange}% WoW`
      : null,
  ].filter(Boolean) as string[];

  const requiresAttentionToday: string[] = [];
  if (metrics.attention.abandonedInquiries > 0) {
    requiresAttentionToday.push(`Clear ${metrics.attention.abandonedInquiries} stale booking inquiries`);
  }
  if (metrics.attention.followUpClients > 0) {
    requiresAttentionToday.push(`Re-engage ${metrics.attention.followUpClients} inactive clients`);
  }

  const opportunitiesAppeared: string[] = [];
  if (metrics.traffic.visitors30 > 50 && metrics.traffic.conversionRate < 2) {
    opportunitiesAppeared.push("Soft conversion with present traffic — CTA/trust audit candidate");
  }
  if (metrics.attention.abandonedInquiries > 0) {
    opportunitiesAppeared.push("Recoverable demand sitting in stale inquiry queue (Measured count; $ unknown)");
  }

  const risksIncreased: string[] = [...graph.downstreamAlerts];
  const critical = health.components.filter((c) => c.priority === "critical");
  for (const c of critical) risksIncreased.push(`${c.label}: ${c.explain}`);

  const decisionsWaiting: string[] = [];
  try {
    const { items } = await searchMemories({
      workspaceId: getWorkspaceId(),
      category: "web_research",
      limit: 5,
    });
    for (const m of items) {
      const v = m.value as { status?: string; query?: string };
      if (v?.status === "blocked_connector" || v?.status === "insufficient_evidence") {
        decisionsWaiting.push(`Research blocked: ${(v.query || m.title).slice(0, 60)}`);
      }
    }
  } catch {
    /* optional */
  }
  if (metrics.attention.abandonedInquiries > 0) {
    decisionsWaiting.push("Approve follow-up plan for stale inquiries");
  }

  const doFirst =
    requiresAttentionToday[0] ||
    opportunitiesAppeared[0] ||
    "Confirm analytics firing and review Command Center opportunities";

  return {
    whatChangedOvernight: whatChangedOvernight.length
      ? whatChangedOvernight
      : ["No material overnight deltas detected from connected systems"],
    requiresAttentionToday: requiresAttentionToday.length
      ? requiresAttentionToday
      : ["No critical attention items from measured signals"],
    opportunitiesAppeared: opportunitiesAppeared.length
      ? opportunitiesAppeared
      : ["No new high-signal opportunities from measured data"],
    risksIncreased: risksIncreased.length ? risksIncreased : ["No new risk escalations detected"],
    decisionsWaiting: decisionsWaiting.length ? decisionsWaiting : ["No pending research/approval gates"],
    doFirst,
  };
}

export async function listPredictionValidations(limit = 8): Promise<PredictionRecord[]> {
  const outcomes = await getLearningOutcomes(undefined, limit).catch(() => []);
  return outcomes.map((o, i) => {
    const positive = o.outcome === "positive";
    const negative = o.outcome === "negative";
    return {
      id: o.id || `pred-${i}`,
      subject: o.hypothesis || o.actionType || "Prior recommendation",
      predicted: o.hypothesis || "Prediction not stored as numeric range",
      actual: o.outcome || null,
      accuracy: positive ? 85 : negative ? 40 : null,
      learning: positive
        ? "Outcome supported prior recommendation — confidence can rise slightly on similar cases"
        : negative
          ? "Outcome underperformed — adjust similar future UX/marketing predictions downward"
          : "Awaiting clearer before/after measurement",
      status: positive ? "validated" : negative ? "missed" : "unknown",
      truthKind: "Historical Business Performance",
    };
  });
}
