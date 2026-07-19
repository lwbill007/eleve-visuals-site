/**
 * Command Home — “What happened?”
 * Single executive composition. KPIs are owned metrics only.
 */

import { resolveCommandKpis } from "./resolve-command-kpis";
import { METRIC_OWNERS } from "./metric-owners";
import { buildLiveBusinessHealth } from "../reasoning/live-health";
import { getExecutiveOpportunities } from "../intelligence/opportunity-engine";
import { getExecutiveRisks } from "../intelligence/risk-center";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";
import { systemPromptForTask } from "../prompts/system";
import {
  buildExecutiveRecommendation,
  toRecommendationContract,
} from "./recommendation-contract";
import type { ExecutiveOpportunity, ExecutiveRisk, PrioritizedRecommendation } from "../types";
import type { ChangeInsight, CommandHomePayload } from "./command-home-types";

export type { ChangeInsight, CommandHomePayload } from "./command-home-types";

const DOMAIN_HREFS: Record<string, string> = {
  revenue: METRIC_OWNERS.financial_center.href,
  sales: METRIC_OWNERS.bookings.href,
  marketing: METRIC_OWNERS.analytics.href,
  clients: METRIC_OWNERS.clients.href,
  operations: "/admin/workboard",
  brand: "/admin/marketing",
  technology: "/admin/qa",
  clientExperience: METRIC_OWNERS.clients.href,
};

function opportunityToPrioritized(o: ExecutiveOpportunity): PrioritizedRecommendation {
  return {
    id: o.id,
    title: o.title,
    detail: o.detail,
    category: o.category,
    estimatedRevenue: o.expectedRevenue,
    confidence: o.confidence,
    timeToCompleteMinutes: o.estimatedMinutes,
    difficulty:
      o.effort === "low" ? "easy" : o.effort === "high" ? "hard" : "moderate",
    priority:
      o.urgency === "critical"
        ? "critical"
        : o.urgency === "high"
          ? "high"
          : o.urgency === "low"
            ? "low"
            : "medium",
    whyNow: o.why,
    evidence: o.evidence,
    actions: o.actions,
  };
}

async function buildExecutiveNarrative(input: {
  win: string | null;
  problem: string | null;
  opportunity: string | null;
  risk: string | null;
  facts: string[];
}): Promise<string> {
  const fallback = [
    input.win ? `Win: ${input.win}` : null,
    input.problem ? `Problem: ${input.problem}` : null,
    input.opportunity ? `Opportunity: ${input.opportunity}` : null,
    input.risk ? `Risk: ${input.risk}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!isAIConfigured()) {
    return fallback || "No measured executive signals yet. Connect Payments and Analytics to unlock the morning brief.";
  }

  try {
    // Fail fast — never burn the free-model daily quota cascading retries on Home.
    const result = await Promise.race([
      aiComplete({
        task: "executive_summary",
        temperature: 0.2,
        maxTokens: 280,
        messages: [
          {
            role: "system",
            content: systemPromptForTask(
              "Write a 3–5 sentence CEO executive summary for ÉLEVÉ Visuals. Use only the provided facts. Never invent revenue, ROI, or percentages. If a fact is missing, say data is limited."
            ),
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6_000)),
    ]);
    return result?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function buildCommandHome(): Promise<CommandHomePayload> {
  // Fetch shared metrics once — parallel getOperatorMetrics() calls exhaust the Prisma pool.
  const [metrics, analytics7, analytics30] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(7),
    getAnalyticsSummary(30),
  ]);

  // Soft-fail opportunities/risks so Home still loads when AI/Prisma fans out.
  const [kpis, health, opportunities, risks] = await Promise.all([
    resolveCommandKpis(metrics),
    buildLiveBusinessHealth(metrics),
    getExecutiveOpportunities(metrics).catch((err) => {
      console.error("Command home opportunities failed:", err);
      return [] as ExecutiveOpportunity[];
    }),
    getExecutiveRisks(metrics).catch((err) => {
      console.error("Command home risks failed:", err);
      return [] as ExecutiveRisk[];
    }),
  ]);

  const topOpp = opportunities[0] ?? null;
  const topRisk = risks[0] ?? null;
  const win =
    metrics.month.bookingsChange > 0
      ? {
          title: `Bookings ${metrics.month.bookingsChange >= 0 ? "up" : "down"} ${Math.abs(metrics.month.bookingsChange)}% vs last month`,
          evidence: [
            `${metrics.month.bookings} bookings this month (Measured)`,
            `${metrics.month.bookingsChange}% month-over-month (Measured)`,
          ],
          href: METRIC_OWNERS.bookings.href,
        }
      : metrics.traffic.trafficChange > 0
        ? {
            title: `Website traffic up ${Math.abs(metrics.traffic.trafficChange)}% week-over-week`,
            evidence: [
              `${metrics.traffic.visitors7} visitors this week (Measured)`,
              `Top page: ${metrics.traffic.topPage}`,
            ],
            href: METRIC_OWNERS.analytics.href,
          }
        : null;

  const problem =
    topRisk
      ? {
          title: topRisk.title,
          evidence: topRisk.evidence,
          href: "/admin/risks",
        }
      : metrics.attention.abandonedInquiries > 0
        ? {
            title: `${metrics.attention.abandonedInquiries} stale booking inquiries`,
            evidence: [
              `${metrics.attention.abandonedInquiries} inquiries untouched 3+ days (Measured)`,
            ],
            href: METRIC_OWNERS.bookings.href,
          }
        : null;

  const briefing = await buildExecutiveNarrative({
    win: win?.title ?? null,
    problem: problem?.title ?? null,
    opportunity: topOpp?.title ?? null,
    risk: topRisk?.title ?? null,
    facts: [
      `Bookings MTD: ${metrics.month.bookings}`,
      `Visitors 30d: ${analytics30.totals.uniqueSessions}`,
      `Stale inquiries: ${metrics.attention.abandonedInquiries}`,
      `Pipeline (estimated): $${metrics.revenue.pipeline}`,
    ],
  });

  const domains = health.components.map((c) => ({
    id: c.id,
    label: c.label,
    score: c.score,
    href: DOMAIN_HREFS[c.id] ?? "/admin/qa",
    explain: c.explain,
  }));

  // Ensure Sales domain exists even if live-health uses different keys
  if (!domains.some((d) => d.id === "sales")) {
    domains.splice(1, 0, {
      id: "sales",
      label: "Sales",
      score: metrics.attention.abandonedInquiries === 0 ? 78 : 52,
      href: METRIC_OWNERS.bookings.href,
      explain:
        metrics.attention.abandonedInquiries > 0
          ? `${metrics.attention.abandonedInquiries} stale inquiries awaiting response`
          : "No stale inquiry backlog",
    });
  }

  const whatChanged: ChangeInsight[] = [
    {
      id: "bookings-month",
      label: "Bookings",
      period: "last_month",
      direction:
        metrics.month.bookingsChange > 0
          ? "up"
          : metrics.month.bookingsChange < 0
            ? "down"
            : "flat",
      deltaLabel: `${metrics.month.bookingsChange >= 0 ? "+" : ""}${metrics.month.bookingsChange}%`,
      why:
        metrics.month.bookingsChange !== 0
          ? `Inquiry volume moved ${Math.abs(metrics.month.bookingsChange)}% versus the prior month based on verified submission counts.`
          : "Booking volume is flat versus last month.",
      evidence: [
        `${metrics.month.bookings} bookings this month (Measured)`,
        "Source: Submission.type=booking",
      ],
      ownerHref: METRIC_OWNERS.bookings.href,
      confidence: 0.95,
    },
    {
      id: "traffic-week",
      label: "Website visitors",
      period: "last_week",
      direction:
        metrics.traffic.trafficChange > 0
          ? "up"
          : metrics.traffic.trafficChange < 0
            ? "down"
            : analytics7.totals.uniqueSessions === 0
              ? "unknown"
              : "flat",
      deltaLabel:
        analytics7.totals.uniqueSessions === 0
          ? "Unknown"
          : `${metrics.traffic.trafficChange >= 0 ? "+" : ""}${metrics.traffic.trafficChange}%`,
      why:
        analytics7.totals.uniqueSessions === 0
          ? "No analytics sessions recorded this week — traffic change cannot be explained yet."
          : `Traffic moved ${Math.abs(metrics.traffic.trafficChange)}% week-over-week. Top page: ${metrics.traffic.topPage}.`,
      evidence: [
        `${metrics.traffic.visitors7} visitors this week`,
        `Top page: ${metrics.traffic.topPage}`,
      ],
      ownerHref: METRIC_OWNERS.analytics.href,
      confidence: analytics7.totals.uniqueSessions === 0 ? 0 : 0.85,
    },
  ];

  const priorities = opportunities.slice(0, 5).map((o) =>
    toRecommendationContract(
      buildExecutiveRecommendation(opportunityToPrioritized(o), {
        owner: o.owner ?? "Studio owner",
      })
    )
  );

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: {
      briefing,
      biggestWin: win,
      biggestProblem: problem,
      biggestOpportunity: topOpp
        ? {
            title: topOpp.title,
            evidence: topOpp.evidence,
            href: "/admin/opportunities",
          }
        : null,
      biggestRisk: topRisk
        ? {
            title: topRisk.title,
            evidence: topRisk.evidence,
            href: "/admin/risks",
          }
        : null,
    },
    kpis,
    businessHealth: {
      ...health,
      domains,
    },
    whatChanged,
    priorities,
  };
}

export type { ExecutiveRisk };
