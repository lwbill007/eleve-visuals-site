import { getOperatorMetrics } from "./business-operator";
import { getExecutiveIntelligence } from "./executive-intelligence";
import { getBusinessTimeline } from "./business-timeline";
import { getExecutiveForecasts } from "./forecasting";
import { computeNorthStarMetrics } from "../executive/north-star";
import { detectRevenueLeaks, getExperimentBacklog, totalLeakExposure } from "../executive/revenue-leaks";
import { getLearningOutcomes } from "../memory/learning";
import { recommendExperiments } from "../marketing/experiment-engine";
import { writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";
import { charterSystemPrompt, charterResponseStructure } from "../executive/charter";
import { buildExecutiveReportV2 } from "../platform/build-executive-report-v2";
import type { ExecutiveReportV2 } from "../platform/executive-report-v2";

export interface WeeklyExecutiveReport {
  generatedAt: string;
  weekEnding: string;
  provider: "ai" | "rules";
  headline: string;
  whatImproved: string[];
  whatDeclined: string[];
  whatChanged: string[];
  revenueGenerated: string[];
  moneyLost: string[];
  opportunitiesAppeared: string[];
  risksAppeared: string[];
  competitorChanges: string[];
  testsNext: string[];
  prioritize: string[];
  remove: string[];
  projectedNextMonth: string;
  northStarSummary: string;
  totalRecoverableRevenue: number;
  narrative: string;
  /** Evidence-graded Report 2.0 — preferred for CEO surfaces */
  reportV2?: ExecutiveReportV2;
}

function weekEndingLabel(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function generateWeeklyExecutiveReport(
  options?: { persist?: boolean }
): Promise<WeeklyExecutiveReport> {
  const [
    metrics,
    intelligence,
    timeline,
    forecasts,
    northStar,
    leaks,
    learnings,
    experiments,
    reportV2,
  ] = await Promise.all([
    getOperatorMetrics(),
    getExecutiveIntelligence(),
    getBusinessTimeline(),
    getExecutiveForecasts(),
    computeNorthStarMetrics(),
    detectRevenueLeaks(),
    getLearningOutcomes(undefined, 8),
    getExperimentBacklog().catch(() => recommendExperiments()),
    buildExecutiveReportV2("weekly_ceo").catch(() => null),
  ]);

  const exposure = totalLeakExposure(leaks);
  const revenueForecast = forecasts.find((f) => f.metric === "revenue") ?? forecasts[0];

  const whatImproved: string[] = [];
  const whatDeclined: string[] = [];

  if (metrics.revenue.monthChange > 0) {
    whatImproved.push(`Revenue up ${metrics.revenue.monthChange}% MTD ($${metrics.revenue.thisMonth.toLocaleString()})`);
  } else if (metrics.revenue.monthChange < 0) {
    whatDeclined.push(`Revenue down ${Math.abs(metrics.revenue.monthChange)}% MTD`);
  }

  if (metrics.traffic.conversionChange > 0) {
    whatImproved.push(`Conversion rate improved to ${metrics.traffic.conversionRate}%`);
  } else if (metrics.traffic.conversionChange < -0.5) {
    whatDeclined.push(`Conversion rate declined to ${metrics.traffic.conversionRate}%`);
  }

  if (metrics.month.bookingsChange > 0) {
    whatImproved.push(`Bookings up ${metrics.month.bookingsChange}% (${metrics.month.bookings} this month)`);
  } else if (metrics.month.bookingsChange < 0) {
    whatDeclined.push(`Bookings down ${Math.abs(metrics.month.bookingsChange)}%`);
  }

  for (const l of learnings.filter((o) => o.outcome === "positive").slice(0, 3)) {
    whatImproved.push(`Learning confirmed: ${l.hypothesis || l.actionType}`);
  }
  for (const l of learnings.filter((o) => o.outcome === "negative").slice(0, 2)) {
    whatDeclined.push(`Recommendation underperformed: ${l.hypothesis || l.actionType}`);
  }

  const whatChanged = timeline.slice(0, 6).map((e) => `${e.date}: ${e.title}`);

  const revenueGenerated = [
    `$${metrics.revenue.thisMonth.toLocaleString()} pipeline revenue MTD`,
    `${metrics.month.bookings} bookings closed or in progress`,
    ...northStar.revenueByTrafficSource.slice(0, 2).map(
      (s) => `${s.source}: ~$${s.revenue.toLocaleString()} estimated (30d)`
    ),
  ];

  const moneyLost = leaks.slice(0, 5).map((l) =>
    l.estimatedLoss > 0
      ? `${l.title} — AI Prediction ~$${l.estimatedLoss.toLocaleString()} (${Math.round(l.confidence * 100)}% conf) · ${l.formula}`
      : `${l.title} — ${l.reason} · More financial data required for $ exposure`
  );

  const opportunitiesAppeared = intelligence.opportunities
    .slice(0, 5)
    .map((o) => `${o.title} (~$${o.expectedRevenue.toLocaleString()}, ${o.urgency} urgency)`);

  const risksAppeared = intelligence.risks
    .slice(0, 4)
    .map((r) => `${r.title} (${r.severity})`);

  const testsNext = experiments.slice(0, 4).map((e) => `${e.title} — ${e.hypothesis}`);

  const prioritize = [
    ...intelligence.opportunities.slice(0, 3).map((o) => o.title),
    ...leaks.slice(0, 2).map((l) => `Fix: ${l.title}`),
  ];

  const remove: string[] = [];
  if (metrics.traffic.conversionRate < 1) {
    remove.push("Low-performing pages without CTAs (run Intelligence Refresh for specifics)");
  }

  const projectedNextMonth = revenueForecast
    ? `${revenueForecast.label}: $${revenueForecast.predicted.toLocaleString()} (${Math.round(revenueForecast.confidence * 100)}% confidence)`
    : `Projected ~$${Math.round(metrics.revenue.thisMonth * (1 + metrics.revenue.monthChange / 100)).toLocaleString()} based on current trend`;

  const northStarSummary = [
    `${northStar.qualifiedInquiries} qualified inquiries MTD`,
    `${northStar.bookingFormCompletionRate}% booking completion`,
    `$${northStar.averageProjectValue.toLocaleString()} APV`,
    `$${northStar.revenuePerVisitor} revenue/visitor`,
  ].join(" · ");

  let narrative = `Week ending ${weekEndingLabel()}: $${metrics.revenue.thisMonth.toLocaleString()} MTD revenue (pipeline/ops), ${metrics.month.bookings} bookings, ${metrics.traffic.visitors30} visitors. ${leaks.length} revenue risks flagged — dollar “recoverable” totals are AI Predictions only when present, otherwise More financial data required. Top priority: ${prioritize[0] ?? "Run Intelligence Refresh"}.`;
  let provider: WeeklyExecutiveReport["provider"] = "rules";

  if (isAIConfigured()) {
    try {
      const result = await aiComplete({
        task: "long_form_reasoning",
        messages: [
          {
            role: "system",
            content: `${charterSystemPrompt()}\n\n${charterResponseStructure()}\n\nWrite a weekly executive report for ÉLEVÉ Visuals. Use only numbers from the JSON. Never invent ROI, conversion lifts, brand equity %, recoverable dollars, or competitor facts. Label analysis vs measured data. If financial projections are missing, say More financial data required.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              weekEnding: weekEndingLabel(),
              whatImproved,
              whatDeclined,
              revenueGenerated,
              moneyLost,
              opportunitiesAppeared,
              risksAppeared,
              testsNext,
              prioritize,
              projectedNextMonth,
              northStarSummary,
              leakCount: leaks.length,
              leakDisclaimer: exposure.disclaimer,
              totalRecoverableIsPredictionOnly: true,
            }),
          },
        ],
        maxTokens: 700,
      });
      if (result?.content) {
        narrative = result.content;
        provider = "ai";
      }
    } catch {
      /* keep rules narrative */
    }
  }

  const headline =
    leaks.length > 0
      ? `${leaks.length} revenue risks · ${prioritize[0] ?? "Review opportunities"} · $ figures are predictions when shown`
      : `${metrics.month.bookings} bookings · $${metrics.revenue.thisMonth.toLocaleString()} MTD · ${prioritize[0] ?? "Steady operations"}`;

  const report: WeeklyExecutiveReport = {
    generatedAt: new Date().toISOString(),
    weekEnding: weekEndingLabel(),
    provider,
    headline,
    whatImproved,
    whatDeclined,
    whatChanged,
    revenueGenerated,
    moneyLost,
    opportunitiesAppeared,
    risksAppeared,
    competitorChanges: ["External competitive monitoring not yet connected — Unknown (More Data Required)"],
    testsNext,
    prioritize,
    remove,
    projectedNextMonth,
    northStarSummary,
    totalRecoverableRevenue: Math.round(exposure.recoverable),
    narrative,
    ...(reportV2 ? { reportV2 } : {}),
  };

  if (options?.persist) {
    const weekKey = `week-${new Date().toISOString().slice(0, 10)}`;
    await writeMemory({
      workspaceId: getWorkspaceId(),
      layer: "business",
      category: "weekly_report",
      key: weekKey,
      title: `Weekly executive report · ${weekEndingLabel()}`,
      summary: report.headline,
      value: report as unknown as Record<string, unknown>,
      confidence: reportV2 ? reportV2.confidence.overall / 100 : provider === "ai" ? 0.55 : 0.7,
      importance: 90,
      source: provider === "ai" ? "ai" : "system",
      sourceRef: "weekly-executive-report",
      tags: ["executive-report", "weekly", "north-star", "report-v2"],
      verified: false,
      actor: "weekly-report",
      reason:
        "Weekly executive intelligence — AI narrative is unlabeled draft; prefer reportV2 truth labels. Not verified financials.",
    });
  }

  return report;
}
