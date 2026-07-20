import { getCached, setCache, withInflight } from "../cache";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAllExecutiveOpportunities } from "../intelligence/website-opportunities";
import { getExecutiveRisks } from "../intelligence/risk-center";
import { buildWebsiteIntelligenceEngine } from "../intelligence/website-engine";
import { getAdminCRMContacts, getAdminDashboardOSCached } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { getContinuousIntelligenceStatus } from "../research/monitor";
import { runExecutiveResearch } from "../research/pipeline";
import {
  buildDecisionTrace,
  buildScenarioSimulation,
  buildExecutiveDebate,
  buildSelfAudit,
  defaultBookingCtaScenarios,
} from "../reasoning/decision-trace";
import {
  buildLiveBusinessHealth,
  buildIntelligenceGraph,
  buildExecutiveOvernightBrief,
  listPredictionValidations,
} from "../reasoning/live-health";
import { evaluateEvidenceExpiration, SOURCE_RELIABILITY_CATALOG } from "../reasoning/source-reliability";
import {
  REPORT_V3_DISCLAIMER,
  type ActionPlanBucket,
  type ExecutiveReportV3,
  type MeasuredMetric,
  type ReportConfidence,
  type ReportDataSource,
  type ReportHealthScore,
  type ReportOpportunity,
  type ReportPrediction,
  type ReportRecommendation,
  type ReportRisk,
  type ReportTruthKind,
  type RootCauseHypothesis,
  type StrategyOption,
} from "./executive-report-v2";

function metric(
  id: string,
  label: string,
  value: string | null | undefined,
  note?: string,
  truthKind: ReportTruthKind = "Measured Data"
): MeasuredMetric {
  if (value == null || value === "" || value === "NaN") {
    return {
      id,
      label,
      value: "Not enough data available.",
      truthKind: "Unknown (More Data Required)",
      note,
    };
  }
  return { id, label, value, truthKind, note };
}

function mapReportTruthKind(kind: string): ReportTruthKind {
  if (kind === "Measured Data") return "Measured Data";
  if (kind === "AI Analysis") return "AI Analysis";
  if (kind === "Industry Best Practice") return "Industry Best Practice";
  if (kind === "Verified External Research") return "Verified External Research";
  if (kind === "Historical Business Performance") return "Historical Business Performance";
  if (kind === "Estimated Opportunity" || kind === "AI Prediction") return "AI Prediction";
  return "Unknown (More Data Required)";
}

function mapLevel(raw?: string): "Low" | "Medium" | "High" {
  const s = (raw || "medium").toLowerCase();
  if (s.includes("critical") || s.includes("high")) return "High";
  if (s.includes("low")) return "Low";
  return "Medium";
}

function mapRiskCategory(raw: string): ReportRisk["category"] {
  const s = raw.toLowerCase();
  if (/market|seo|content|campaign/.test(s)) return "Marketing";
  if (/tech|site|performance|access/.test(s)) return "Technical";
  if (/financ|cash/.test(s)) return "Financial";
  if (/revenue|booking|pipeline/.test(s)) return "Revenue";
  if (/ops|deliver|product/.test(s)) return "Operational";
  if (/brand/.test(s)) return "Brand";
  if (/client|cx|experience/.test(s)) return "Customer Experience";
  if (/legal|compliance|privacy/.test(s)) return "Compliance";
  return "Revenue";
}

/** @deprecated Prefer buildExecutiveReportV3 — alias kept for call sites */
export async function buildExecutiveReportV2(
  reportType: string = "daily_ceo"
): Promise<ExecutiveReportV3> {
  return buildExecutiveReportV3(reportType);
}

export async function buildExecutiveReportV3(
  reportType: string = "daily_ceo"
): Promise<ExecutiveReportV3> {
  const cacheKey = `executive-report-v3:${reportType}`;
  return withInflight(cacheKey, async () => {
    const cached = await getCached<ExecutiveReportV3>(cacheKey);
    if (cached) return cached;
    const report = await computeExecutiveReportV3(reportType);
    await setCache(cacheKey, report, 5 * 60_000).catch(() => {});
    return report;
  });
}

async function computeExecutiveReportV3(
  reportType: string = "daily_ceo"
): Promise<ExecutiveReportV3> {
  const [
    metrics,
    analytics,
    opportunities,
    risks,
    website,
    dashboard,
    crm,
    portfolioCount,
    researchStatus,
    researchSnapshot,
    liveHealth,
    intelligenceGraph,
    overnightBrief,
    predictionValidations,
  ] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getAllExecutiveOpportunities().catch(() => []),
    getExecutiveRisks().catch(() => []),
    buildWebsiteIntelligenceEngine().catch(() => null),
    getAdminDashboardOSCached(),
    getAdminCRMContacts(),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
    getContinuousIntelligenceStatus().catch(() => null),
    runExecutiveResearch({
      query: `${reportType} executive briefing — SEO UX marketing standards material to ÉLEVÉ`,
      internalSufficient: true,
      persist: false,
    }).catch(() => null),
    buildLiveBusinessHealth().catch(() => null),
    buildIntelligenceGraph().catch(() => null),
    buildExecutiveOvernightBrief().catch(() => null),
    listPredictionValidations(6).catch(() => []),
  ]);

  const hasAnalytics = analytics.totals.pageviews > 0;
  const hasBookings = metrics.month.bookings > 0 || dashboard.metrics.bookings.pending > 0;
  const presentSources = [
    crm.length > 0,
    hasBookings,
    hasAnalytics,
    portfolioCount > 0,
    Boolean(website?.dataSources.find((d) => d.id === "seo_scan")?.present),
    metrics.revenue.thisMonth > 0,
  ].filter(Boolean).length;
  const verificationCoverage = Math.round((presentSources / 6) * 100);

  const dataSources: ReportDataSource[] = [
    {
      id: "crm",
      label: "CRM",
      present: crm.length > 0,
      detail: crm.length ? `${crm.length} contacts` : "No CRM contacts yet",
    },
    {
      id: "booking",
      label: "Booking Data",
      present: hasBookings,
      detail: `${metrics.month.bookings} bookings MTD · ${metrics.attention.abandonedInquiries} stale inquiries`,
    },
    {
      id: "analytics",
      label: "Website Analytics",
      present: hasAnalytics,
      detail: hasAnalytics
        ? `${analytics.totals.pageviews} pageviews · ${analytics.totals.conversionRate}% conversion (30d)`
        : "No first-party analytics events",
    },
    {
      id: "portfolio",
      label: "Portfolio Analytics",
      present: portfolioCount > 0,
      detail: `${portfolioCount} published projects`,
    },
    {
      id: "seo",
      label: "SEO Audit",
      present: Boolean(website?.dataSources.find((d) => d.id === "seo_scan")?.present),
      detail:
        website?.dataSources.find((d) => d.id === "seo_scan")?.detail ||
        "Run Intelligence Refresh for SEO scan",
    },
    {
      id: "a11y",
      label: "Accessibility Audit",
      present: Boolean(website?.dataSources.find((d) => d.id === "a11y_scan")?.present),
      detail:
        website?.dataSources.find((d) => d.id === "a11y_scan")?.detail ||
        "No automated a11y scan connected",
    },
    {
      id: "financial",
      label: "Financial Data",
      present: metrics.revenue.thisMonth > 0,
      detail:
        metrics.revenue.thisMonth > 0
          ? `$${metrics.revenue.thisMonth.toLocaleString()} MTD (pipeline/estimate where noted)`
          : "No revenue signal MTD — More financial data required",
    },
    {
      id: "ai",
      label: "AI Analysis",
      present: true,
      detail: "Labeled reasoning layers only — not measured facts",
    },
    {
      id: "live_web",
      label: "Verified Live Web Research",
      present: Boolean(researchStatus?.connectorWired),
      detail: researchStatus
        ? researchStatus.note
        : "Executive Research Division — gated; connector status unknown",
    },
  ];

  const webCat = (id: string) => website?.categories.find((c) => c.id === id);

  const businessScore =
    hasAnalytics || hasBookings
      ? Math.round(
          ((hasBookings ? 70 : 40) +
            (hasAnalytics ? Math.min(90, metrics.traffic.conversionRate * 20) : 30) +
            (metrics.revenue.monthChange >= 0 ? 75 : 55)) /
            3
        )
      : null;

  const dashboardScores: ReportHealthScore[] = [
    {
      id: "business",
      label: "Business Health",
      score: businessScore,
      scoreLabel: businessScore != null ? String(businessScore) : "Insufficient data",
      trend30d:
        metrics.revenue.monthChange > 2
          ? "up"
          : metrics.revenue.monthChange < -2
            ? "down"
            : hasAnalytics
              ? "flat"
              : "unknown",
      confidence: hasAnalytics ? 72 : 40,
      priority: metrics.attention.abandonedInquiries > 3 ? "critical" : "high",
      truthKind: hasAnalytics || hasBookings ? "AI Analysis" : "Unknown (More Data Required)",
    },
    {
      id: "revenue",
      label: "Revenue Health",
      score: null,
      scoreLabel:
        metrics.revenue.thisMonth > 0
          ? `$${metrics.revenue.thisMonth.toLocaleString()} MTD`
          : "Not enough data",
      trend30d:
        metrics.revenue.monthChange > 0
          ? "up"
          : metrics.revenue.monthChange < 0
            ? "down"
            : "unknown",
      confidence: metrics.revenue.thisMonth > 0 ? 70 : 30,
      priority: "high",
      truthKind:
        metrics.revenue.thisMonth > 0 && metrics.revenue.verified
          ? "Measured Data"
          : metrics.revenue.thisMonth > 0
            ? "AI Analysis"
            : "Unknown (More Data Required)",
    },
    {
      id: "marketing",
      label: "Marketing Health",
      score: hasAnalytics ? Math.min(90, Math.round(45 + analytics.totals.uniqueSessions / 10)) : null,
      scoreLabel: hasAnalytics
        ? String(Math.min(90, Math.round(45 + analytics.totals.uniqueSessions / 10)))
        : "Not enough data",
      trend30d: "unknown",
      confidence: hasAnalytics ? 65 : 30,
      priority: "medium",
      truthKind: hasAnalytics ? "Measured Data" : "Unknown (More Data Required)",
    },
    {
      id: "sales",
      label: "Sales Health",
      score: hasBookings
        ? Math.min(95, 50 + metrics.month.bookings * 8 - metrics.attention.abandonedInquiries * 3)
        : null,
      scoreLabel: hasBookings ? "Pipeline-based" : "Not enough data",
      trend30d: metrics.attention.abandonedInquiries > 0 ? "down" : "flat",
      confidence: 78,
      priority: metrics.attention.abandonedInquiries > 0 ? "critical" : "medium",
      truthKind: "Measured Data",
    },
    {
      id: "operations",
      label: "Operations Health",
      score:
        metrics.attention.abandonedInquiries > 3
          ? 40
          : metrics.attention.abandonedInquiries > 0
            ? 62
            : hasBookings
              ? 78
              : null,
      scoreLabel:
        metrics.attention.abandonedInquiries > 0
          ? `${metrics.attention.abandonedInquiries} stale inquiries`
          : hasBookings
            ? "Queue clear"
            : "Not enough data",
      trend30d: metrics.attention.abandonedInquiries > 0 ? "down" : "flat",
      confidence: 80,
      priority: metrics.attention.abandonedInquiries > 0 ? "critical" : "medium",
      truthKind: "Measured Data",
    },
    {
      id: "creative",
      label: "Creative Health",
      score: portfolioCount > 0 ? Math.min(92, 40 + portfolioCount * 5) : null,
      scoreLabel: portfolioCount > 0 ? `${portfolioCount} published` : "Empty portfolio",
      trend30d: "flat",
      confidence: 80,
      priority: portfolioCount < 6 ? "high" : "low",
      truthKind: "Measured Data",
    },
    {
      id: "customer",
      label: "Customer Health",
      score: null,
      scoreLabel: "Not measured",
      trend30d: "unknown",
      confidence: 20,
      priority: "medium",
      truthKind: "Unknown (More Data Required)",
    },
    {
      id: "brand",
      label: "Brand Health",
      score: webCat("brand")?.score ?? null,
      scoreLabel: webCat("brand")?.scoreLabel ?? "AI qualitative",
      trend30d: "flat",
      confidence: webCat("brand")?.confidence ?? 45,
      priority: "medium",
      truthKind: "AI Analysis",
    },
    {
      id: "knowledge_confidence",
      label: "Knowledge Confidence",
      score: website?.confidence.overall ?? (hasAnalytics ? 55 : 30),
      scoreLabel: "Composite of connected sources",
      trend30d: "unknown",
      confidence: verificationCoverage,
      priority: verificationCoverage < 50 ? "high" : "medium",
      truthKind: "AI Analysis",
    },
    {
      id: "verification_coverage",
      label: "Verification Coverage",
      score: verificationCoverage,
      scoreLabel: `${presentSources}/6 core sources present`,
      trend30d: "unknown",
      confidence: 90,
      priority: verificationCoverage < 50 ? "high" : "low",
      truthKind: "Measured Data",
    },
    {
      id: "automation_readiness",
      label: "Automation Readiness",
      score: null,
      scoreLabel: "Approvals required — nothing auto-executes",
      trend30d: "unknown",
      confidence: 95,
      priority: "low",
      truthKind: "Industry Best Practice",
    },
    {
      id: "prediction_confidence",
      label: "Prediction Confidence",
      score: hasAnalytics && hasBookings ? 48 : 28,
      scoreLabel: "Capped — thin outcome history",
      trend30d: "unknown",
      confidence: hasAnalytics && hasBookings ? 48 : 28,
      priority: "medium",
      truthKind: "AI Prediction",
    },
    {
      id: "trend",
      label: "Trend Direction",
      score: null,
      scoreLabel:
        metrics.revenue.monthChange > 0
          ? "Up (MTD revenue change)"
          : metrics.revenue.monthChange < 0
            ? "Down (MTD revenue change)"
            : "Requires longer history",
      trend30d:
        metrics.revenue.monthChange > 0
          ? "up"
          : metrics.revenue.monthChange < 0
            ? "down"
            : "unknown",
      confidence: metrics.revenue.thisMonth > 0 ? 60 : 30,
      priority: "medium",
      truthKind:
        metrics.revenue.thisMonth > 0 && metrics.revenue.verified
          ? "Measured Data"
          : metrics.revenue.thisMonth > 0
            ? "AI Analysis"
            : "Unknown (More Data Required)",
    },
  ];

  const revenueTruth: ReportTruthKind =
    metrics.revenue.thisMonth > 0 && metrics.revenue.verified
      ? "Measured Data"
      : metrics.revenue.thisMonth > 0
        ? "AI Analysis"
        : "Unknown (More Data Required)";

  const measuredSituation: MeasuredMetric[] = [
    metric("visitors", "Website Visitors (30d)", hasAnalytics ? String(analytics.totals.uniqueSessions) : null),
    metric("pageviews", "Pageviews (30d)", hasAnalytics ? String(analytics.totals.pageviews) : null),
    metric("bookings_mtd", "Bookings MTD", String(metrics.month.bookings)),
    metric(
      "conversion",
      "Conversion Rate (30d)",
      hasAnalytics ? `${analytics.totals.conversionRate}%` : null
    ),
    metric(
      "revenue_mtd",
      "Revenue MTD",
      metrics.revenue.thisMonth > 0 ? `$${metrics.revenue.thisMonth.toLocaleString()}` : null,
      metrics.revenue.verified
        ? "Settled payments (Payments Verified)"
        : "Pipeline estimate — not settled cash",
      revenueTruth
    ),
    metric("stale", "Stale Inquiries", String(metrics.attention.abandonedInquiries)),
    metric("inactive_clients", "Inactive Clients (60d+)", String(metrics.attention.followUpClients)),
    metric("portfolio", "Published Portfolio", String(portfolioCount)),
    metric(
      "top_page",
      "Top Page",
      analytics.topPages[0] ? `${analytics.topPages[0].path} (${analytics.topPages[0].views} views)` : null
    ),
    metric(
      "top_source",
      "Top Traffic Source",
      analytics.topSources[0]
        ? `${analytics.topSources[0].source} (${analytics.topSources[0].visits})`
        : null
    ),
  ];

  const rootCauses: RootCauseHypothesis[] = [];
  if (hasAnalytics && analytics.totals.conversionRate < 2) {
    rootCauses.push({
      id: "soft-conversion",
      hypothesis:
        "Homepage traffic may not convert to consultations due to trust, CTA clarity, or booking friction.",
      confidence: 58,
      supportingEvidence: [
        `Measured conversion rate ${analytics.totals.conversionRate}% (30d)`,
        "Traffic present while conversion remains soft",
      ],
      missingEvidence: [
        "Heatmaps unavailable",
        "Session recordings unavailable",
        "A/B test history unavailable",
        "Consultation close rate by source unavailable",
      ],
      alternatives: [
        "Offer/pricing mismatch",
        "Mobile UX friction on /book",
        "Audience quality from traffic sources",
      ],
    });
  }
  if (metrics.attention.abandonedInquiries > 0) {
    rootCauses.push({
      id: "speed-to-lead",
      hypothesis: "Slow follow-up on open inquiries is cooling pipeline value.",
      confidence: 84,
      supportingEvidence: [
        `${metrics.attention.abandonedInquiries} inquiries marked abandoned/stale in CRM (Measured)`,
      ],
      missingEvidence: [
        "Outbound email open rates",
        "Call attempt logs",
        "Verified recovery rate for this studio",
      ],
      alternatives: ["Leads already booked elsewhere", "Spam / low-intent inquiries"],
    });
  }
  if (!hasAnalytics) {
    rootCauses.push({
      id: "measurement-gap",
      hypothesis: "Incomplete analytics coverage is limiting trustworthy diagnosis.",
      confidence: 92,
      supportingEvidence: ["First-party analytics returned insufficient traffic for 30d window"],
      missingEvidence: ["Pageview + conversion event stream"],
      alternatives: ["Tracking blocked in production", "Very new site with no volume yet"],
    });
  }

  const reportOpportunities: ReportOpportunity[] = [];

  if (metrics.attention.abandonedInquiries > 0) {
    reportOpportunities.push({
      id: "recover-inquiries",
      title: "Recover stale booking inquiries",
      opportunityScore: Math.min(95, 55 + metrics.attention.abandonedInquiries * 5),
      businessImpact: metrics.attention.abandonedInquiries > 3 ? "high" : "medium",
      confidence: 86,
      supportingEvidence: [
        `${metrics.attention.abandonedInquiries} stale inquiries (Measured Data)`,
      ],
      dependencies: ["CRM / Booking Command Center access"],
      requiredResources: ["Owner time for personalized follow-up"],
      timeToValue: "Same day to 1 week",
      financialProjection: "More financial data required — do not cite invented recovery dollars",
      estimatedEffort: "low",
      reasoning:
        "Measured demand remains in pipeline. Recovery dollars are unknown without studio-specific close history.",
      truthKind: "Measured Data",
    });
  }

  for (const o of opportunities.slice(0, 5)) {
    if (reportOpportunities.some((r) => r.title === o.title)) continue;
    reportOpportunities.push({
      id: o.id || `opp-${reportOpportunities.length}`,
      title: o.title,
      opportunityScore: Math.round((o.confidence || 0.6) * 70 + (o.urgency === "critical" ? 25 : o.urgency === "high" ? 15 : 5)),
      businessImpact: o.urgency === "critical" || o.urgency === "high" ? "high" : "medium",
      confidence: Math.round((o.confidence || 0.65) * 100),
      supportingEvidence: (o.evidence || []).slice(0, 3).map((e) =>
        e.toLowerCase().includes("benchmark") || e.toLowerCase().includes("industry")
          ? `Industry Best Practice (unverified for this studio): ${e}`
          : e
      ),
      dependencies: o.actions?.map((a) => a.label).slice(0, 2) || ["Review in Opportunities"],
      requiredResources: [`Effort: ${o.effort || "medium"}`],
      timeToValue: o.estimatedMinutes ? `~${o.estimatedMinutes} min focused work` : "Unknown",
      financialProjection:
        "More financial data required — expectedRevenue heuristics are not treated as facts",
      estimatedEffort: o.effort || "medium",
      reasoning: o.detail || o.why || o.title,
      truthKind: "AI Analysis",
    });
  }

  const reportRisks: ReportRisk[] = risks.slice(0, 8).map((r, i) => ({
    id: r.id || `risk-${i}`,
    category: mapRiskCategory(r.category || r.title),
    title: r.title,
    likelihood:
      typeof r.likelihood === "number"
        ? r.likelihood >= 0.75
          ? "High"
          : r.likelihood >= 0.45
            ? "Medium"
            : "Low"
        : mapLevel(r.severity),
    severity: mapLevel(r.severity),
    confidence: Math.round((typeof r.likelihood === "number" ? r.likelihood : 0.6) * 100),
    mitigation: r.mitigations?.[0]?.label || r.detail || "Review in Risks workspace",
    owner: "Operations",
    timeline: r.severity === "critical" || r.severity === "high" ? "Today–This week" : "30 days",
    truthKind: "AI Analysis" as const,
  }));

  if (metrics.attention.abandonedInquiries > 3) {
    reportRisks.unshift({
      id: "pipeline-cool",
      category: "Revenue",
      title: "Warm pipeline cooling from delayed follow-up",
      likelihood: "High",
      severity: "High",
      confidence: 88,
      mitigation: "Work Booking Command Center queue within SLA today",
      owner: "Sales / Billy",
      timeline: "Today",
      truthKind: "Measured Data",
    });
  }

  const predictions: ReportPrediction[] = [];
  if (metrics.attention.abandonedInquiries > 0) {
    predictions.push({
      id: "pred-followup",
      potentialOutcome:
        "Timely personalized follow-up may recover a portion of stale inquiries.",
      estimatedImpact:
        "Directionally positive for bookings — specific $ recovery unknown without studio close-rate history",
      confidence: 55,
      reasoning:
        "Measured stale inquiry count is non-zero; recovery rate for ÉLEVÉ Visuals is not yet verified.",
      dependencies: ["Owner capacity", "Reachable contact info", "Offer still relevant"],
      variables: ["Lead intent", "Response channel", "Days since inquiry"],
      truthKind: "AI Prediction",
    });
  }
  if (hasAnalytics && analytics.totals.conversionRate < 2) {
    predictions.push({
      id: "pred-trust",
      potentialOutcome:
        "Improving homepage trust signals and CTA clarity may increase consultation requests.",
      estimatedImpact:
        "Potential lift unknown — do not cite invented conversion % targets without a measured baseline experiment",
      confidence: 48,
      reasoning:
        "Highest-traffic pages coexist with soft conversion; causality is hypothesized, not proven.",
      dependencies: ["Homepage CMS update", "Before/after analytics window"],
      variables: ["Traffic quality", "Seasonality", "Offer clarity"],
      truthKind: "AI Prediction",
    });
  }

  const recommendations: ReportRecommendation[] = [];

  if (metrics.attention.abandonedInquiries > 0) {
    recommendations.push({
      id: "rec-stale",
      title: "Clear stale inquiry queue",
      businessProblem: "Measured demand is aging without response.",
      priority: metrics.attention.abandonedInquiries > 3 ? "critical" : "high",
      businessImpact: 92,
      customerImpact: 70,
      risk: "low",
      effort: "low",
      confidence: 88,
      evidence: [
        {
          kind: "Measured Data",
          text: `${metrics.attention.abandonedInquiries} abandoned/stale inquiries in CRM`,
        },
        {
          kind: "Unknown (More Data Required)",
          text: "Studio-specific recovery rate and $ recovery not verified — do not invent",
        },
      ],
      tradeoffs: ["Time away from new lead gen", "Risk of contacting already-closed leads"],
      dependencies: ["Booking inbox access"],
      successMetric: "Reduce stale inquiry count; response within SLA (no invented % close target)",
      owner: "Sales / Billy",
      status: "proposed",
      timeline: "Today",
      automationAvailable: true,
      approvalRequired: true,
      whyImportant: "Measured demand is aging in the pipeline.",
      assumptions: ["Inquiries are still reachable via email/phone"],
      missingInfo: ["Last outbound attempt timestamps", "Historical close rate after follow-up"],
      howReached: "Operator metrics abandoned inquiry count + CRM stage ages",
      ifNothingChanges: "Close likelihood likely declines — magnitude unknown without outcomes data",
      whatNext: "Approve follow-up plan, assign owner, measure before/after stale count",
      decisionTrace: buildDecisionTrace({
        observed: [
          {
            text: `${metrics.attention.abandonedInquiries} stale inquiries in CRM`,
            truthKind: "Measured Data",
          },
          {
            text: "Follow-up SLA exceeded on open booking stages",
            truthKind: "Measured Data",
          },
        ],
        evidenceLabels: [
          { label: "CRM / Bookings", present: true },
          { label: "Website Analytics", present: hasAnalytics },
          { label: "Historical Performance", present: false },
        ],
        researchLabels: [
          { label: "Verified External Research", present: false },
        ],
        reasoning:
          "Measured demand remains in pipeline without response. Dollar recovery is unknown without studio close history.",
        businessImpact: metrics.attention.abandonedInquiries > 3 ? "critical" : "high",
        sourceIdsForConfidence: ["internal-analytics"],
        confidenceOverride: 88,
      }),
      selfAudit: buildSelfAudit({
        missingData: ["Outbound attempt logs", "Studio recovery rate"],
        assumptions: ["Contacts remain reachable"],
        verify: ["Work queue in Booking Command Center", "Log outcomes for prediction validation"],
      }),
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "evidence", label: "Request More Evidence", requiresApproval: false },
        { id: "assign", label: "Assign", href: "/admin/submissions?type=booking", requiresApproval: false },
        { id: "project", label: "Create Project", href: "/admin/submissions?type=booking", requiresApproval: false },
        { id: "review", label: "Schedule Review", href: "/admin/email", requiresApproval: true },
        { id: "plan", label: "Generate Implementation Plan", requiresApproval: false },
      ],
    });
  }

  if (hasAnalytics && analytics.totals.conversionRate < 2) {
    recommendations.push({
      id: "rec-cta",
      title: "Audit homepage CTA and trust signals",
      businessProblem: "Traffic is not converting proportionally to consultations.",
      priority: "high",
      businessImpact: 78,
      customerImpact: 85,
      risk: "medium",
      effort: "medium",
      confidence: 62,
      evidence: [
        {
          kind: "Measured Data",
          text: `Conversion rate ${analytics.totals.conversionRate}% over 30 days`,
        },
        {
          kind: "AI Analysis",
          text: "Soft conversion with present traffic often correlates with CTA clarity or trust gaps — not proven here",
        },
        {
          kind: "Industry Best Practice",
          text: "Luxury sites typically present one primary consultation CTA with proof above the fold (general practice — not a measured ÉLEVÉ lift)",
        },
        {
          kind: "Unknown (More Data Required)",
          text: "No verified study attached for conversion lift percentages on this site",
        },
      ],
      tradeoffs: ["Aggressive CTAs can harm luxury positioning"],
      dependencies: ["Homepage CMS update"],
      successMetric:
        "Homepage → /book clicks and consultation/booking conversion — compare before/after; no invented target %",
      owner: "Marketing / Creative",
      status: "proposed",
      timeline: "This week",
      automationAvailable: false,
      approvalRequired: true,
      whyImportant: "Traffic is not converting proportionally.",
      assumptions: ["Traffic quality is comparable week over week"],
      missingInfo: ["Heatmaps", "Device split conversion", "Cited external research"],
      howReached: "Measured conversion threshold + website intelligence heuristics",
      ifNothingChanges: "Acquisition efficiency stays opaque — do not invent revenue loss dollars",
      whatNext: "Approve scoped homepage audit, implement one change, measure 14–30 days",
      decisionTrace: buildDecisionTrace({
        observed: [
          {
            text: `Conversion rate ${analytics.totals.conversionRate}% (30d)`,
            truthKind: "Measured Data",
          },
          {
            text: `${analytics.totals.uniqueSessions} sessions present while booking conversion remains soft`,
            truthKind: "Measured Data",
          },
          {
            text: "Booking / consultation completion not rising with homepage attention",
            truthKind: "AI Analysis",
          },
        ],
        evidenceLabels: [
          { label: "Website Analytics", present: true },
          { label: "CRM", present: crm.length > 0 },
          { label: "Historical Performance", present: false },
        ],
        researchLabels: [
          { label: "Google UX / Search guidance", present: false },
          { label: "Baymard Institute", present: false },
        ],
        reasoning:
          "Homepage (or top pages) generate attention but users fail to continue into the booking funnel at a healthy rate. Causality is hypothesized — not proven without heatmaps/experiments.",
        businessImpact: "high",
        sourceIdsForConfidence: ["internal-analytics", "baymard"],
        confidenceOverride: 62,
      }),
      selfAudit: buildSelfAudit({
        missingData: ["Heatmaps", "Device split conversion", "Cited external research with dates"],
        assumptions: ["Traffic quality comparable week over week"],
        researchLimitations: [
          `Baymard-style UX guidance not attached as Verified External Research this run`,
          `Evidence expiration for Google guidance: ${evaluateEvidenceExpiration({ collectedAt: null, sourceId: "google-search-central" }).reason}`,
        ],
        verify: ["Run one low-risk change (form friction or trust)", "Measure 14–30 days before redesign"],
      }),
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "modify", label: "Modify", href: "/admin/homepage", requiresApproval: false },
        { id: "plan", label: "Generate Implementation Plan", href: "/admin/website", requiresApproval: false },
        { id: "reject", label: "Reject", requiresApproval: true },
      ],
    });
  }

  if (website && !website.dataSources.find((d) => d.id === "seo_scan")?.present) {
    recommendations.push({
      id: "rec-seo-scan",
      title: "Run platform SEO / content scan",
      businessProblem: "SEO recommendations stay speculative without a scan.",
      priority: "high",
      businessImpact: 65,
      customerImpact: 30,
      risk: "low",
      effort: "low",
      confidence: 90,
      evidence: [
        {
          kind: "Measured Data",
          text: "No website-health SEO scan memory present",
        },
      ],
      tradeoffs: ["Scan time"],
      dependencies: ["Memory / Intelligence Refresh"],
      successMetric: "SEO category becomes Measured Data on Website Intelligence",
      owner: "Operations",
      status: "proposed",
      timeline: "Today",
      automationAvailable: true,
      approvalRequired: true,
      whyImportant: "Without a scan, SEO advice cannot be evidence-backed.",
      assumptions: [],
      missingInfo: ["On-page meta/heading inventory"],
      howReached: "Website Intelligence data-source check",
      ifNothingChanges: "SEO advice remains unlabeled speculation",
      whatNext: "Approve Intelligence Refresh, then re-run Report 3.0",
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "project", label: "Create Project", href: "/admin/memory", requiresApproval: false },
      ],
    });
  }

  for (const wr of website?.recommendations.slice(0, 3) || []) {
    if (recommendations.some((r) => r.title === wr.title)) continue;
    recommendations.push({
      id: `web-${wr.id}`,
      title: wr.title,
      businessProblem: wr.whySeeingThis,
      priority: wr.priority,
      businessImpact: wr.businessImpact,
      customerImpact: wr.uxImpact,
      risk: wr.potentialRisks.length > 1 ? "medium" : "low",
      effort: wr.implementationDifficulty,
      confidence: wr.confidence,
      evidence: wr.evidence.map((e) => ({
        kind: mapReportTruthKind(e.kind),
        text: e.text,
      })),
      tradeoffs: wr.potentialRisks,
      dependencies: wr.actions.filter((a) => a.href).map((a) => a.label),
      successMetric: wr.successMetrics[0] || "Track in Website Intelligence — no invented numeric targets",
      owner: "Website / Marketing",
      status: "proposed",
      timeline: wr.estimatedMinutes <= 60 ? "This week" : "30 days",
      automationAvailable: false,
      approvalRequired: true,
      whyImportant: wr.whySeeingThis,
      assumptions: [],
      missingInfo: wr.evidence.filter((e) => e.kind.includes("Unknown") || e.kind.includes("Estimated")).map((e) => e.text),
      howReached: wr.reasoning,
      ifNothingChanges: wr.ifIgnored,
      whatNext: wr.nextStep,
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        {
          id: "assign",
          label: "Assign",
          href: wr.actions.find((a) => a.href)?.href,
          requiresApproval: false,
        },
        { id: "reject", label: "Reject", requiresApproval: true },
        { id: "plan", label: "Generate Implementation Plan", requiresApproval: false },
      ],
    });
  }

  const scenarioSimulation = buildScenarioSimulation({
    scenarios: defaultBookingCtaScenarios(),
    reasoning:
      "Rank by impact × confidence − risk. Prefer lower-risk friction fixes before a full redesign when measurement is thin.",
  });

  const ordered = scenarioSimulation.recommendationOrder
    .map((id) => scenarioSimulation.scenarios.find((s) => s.id === id)?.label)
    .filter(Boolean);

  const strategies: StrategyOption[] = scenarioSimulation.scenarios.map((s) => ({
    id: s.id,
    label: s.label,
    summary: s.summary,
    investment: `Effort ${s.effort}`,
    risk: s.risk,
    expectedOutcome: `Estimated impact: ${s.estimatedImpact} (not a guaranteed lift)`,
    confidence: s.confidence,
    dependencies: s.dependencies,
    estimatedImpact: s.estimatedImpact,
  }));

  const executiveDebate = buildExecutiveDebate(
    [
      {
        role: "Marketing Director",
        position: "Increase Instagram spend to feed the top of funnel.",
        concern: "Traffic without conversion may waste spend.",
        truthKind: "AI Analysis",
      },
      {
        role: "Finance",
        position: "Delay paid expansion.",
        concern: "Current paid ROI is unverified — attribution connector incomplete.",
        truthKind: "Unknown (More Data Required)",
      },
      {
        role: "SEO Director",
        position: "Prioritize organic clarity and booking path UX.",
        concern: "Organic fixes compound; paid without attribution is opaque.",
        truthKind: "AI Analysis",
      },
    ],
    metrics.attention.abandonedInquiries > 0
      ? "Do first: clear stale inquiries. Then reduce booking friction before paid expansion — attribution not ready."
      : ordered.length
        ? `CEO recommendation: start with ${ordered[0]}, then ${ordered[1] ?? "measure"}. Delay paid expansion until attribution is connected.`
        : "Delay paid expansion until attribution is connected; protect measurement quality."
  );

  const reportSelfAudit = buildSelfAudit({
    missingData: [
      !hasAnalytics ? "Website analytics coverage" : "",
      "Verified external research with publication dates",
      "Consultation close rate by source",
      "Lighthouse / CWV connectors",
    ].filter(Boolean),
    assumptions: [
      "Operator metrics accurately reflect pipeline stages",
      "Stale inquiry counts are actionable demand",
    ],
    weaknesses: [
      "Some dashboard health scores are composite AI Analysis, not audited financials",
      "Scenario impacts are qualitative — not invented % lifts",
    ],
    alternatives: [
      "Soft conversion is traffic-quality driven, not UX",
      "Stale inquiries are low-intent / spam",
    ],
    researchLimitations: [
      `Source reliability catalog loaded (${SOURCE_RELIABILITY_CATALOG.length} profiles) — live fetches may still be offline`,
      researchStatus?.connectorWired
        ? "Web connector present"
        : "Web research connector not wired — no fabricated citations",
    ],
    verify: [
      overnightBrief?.doFirst || "Confirm Command Center queue",
      "Approve before any client-facing change",
      "Record outcomes for prediction validation",
    ],
  });

  const actionPlan: ActionPlanBucket[] = [
    {
      horizon: "today",
      label: "Immediate Actions (Today)",
      items: recommendations
        .filter((r) => r.timeline === "Today" || r.priority === "critical")
        .slice(0, 4)
        .map((r) => ({
          title: r.title,
          owner: r.owner,
          truthKind: r.evidence[0]?.kind || "AI Analysis",
        })),
    },
    {
      horizon: "week",
      label: "Short-Term (This Week)",
      items: recommendations
        .filter((r) => r.timeline === "This week" || r.priority === "high")
        .slice(0, 4)
        .map((r) => ({
          title: r.title,
          owner: r.owner,
          truthKind: r.evidence[0]?.kind || "AI Analysis",
        })),
    },
    {
      horizon: "30d",
      label: "Medium-Term (30 Days)",
      items: [
        {
          title: "Compare before/after on any approved website changes",
          owner: "Operations",
          truthKind: "Industry Best Practice",
        },
        {
          title: "Record outcomes — did bookings/conversion improve? Update learning loop",
          owner: "CEO / Operations",
          truthKind: "AI Analysis",
        },
      ],
    },
    {
      horizon: "quarter",
      label: "Long-Term (Quarter)",
      items: [
        {
          title: "Connect performance measurement (Lighthouse/CWV) — do not invent scores until then",
          owner: "Technical",
          truthKind: "Industry Best Practice",
        },
        {
          title: "Build studio-specific recovery/close rates so future $ projections are Measured or Historical",
          owner: "CEO / Operations",
          truthKind: "Unknown (More Data Required)",
        },
      ],
    },
  ];

  if (actionPlan[0].items.length === 0) {
    actionPlan[0].items.push({
      title: "Review Command Center opportunities and confirm analytics are firing",
      owner: "Billy",
      truthKind: hasAnalytics ? "Measured Data" : "Unknown (More Data Required)",
    });
  }

  const confidence: ReportConfidence = {
    business: hasBookings ? 80 : 45,
    marketing: hasAnalytics ? 65 : 35,
    seo: webCat("seo")?.confidence ?? 30,
    ux: website?.confidence.ux ?? 40,
    technical: 25,
    financial: metrics.revenue.thisMonth > 0 ? 55 : 25,
    creative: portfolioCount > 0 ? 60 : 40,
    overall: Math.round(
      ((hasBookings ? 80 : 45) +
        (hasAnalytics ? 65 : 35) +
        (webCat("seo")?.confidence ?? 30) +
        (metrics.revenue.thisMonth > 0 ? 55 : 25) +
        verificationCoverage) /
        5
    ),
    reasoning: [
      hasAnalytics ? "Website analytics measured" : "Analytics coverage incomplete — lowers overall confidence",
      hasBookings ? "Booking/CRM signals present" : "Limited booking volume",
      "Live web research and Lighthouse not connected — technical/SEO confidence capped",
      "No fabricated conversion lifts, brand equity %, or recoverable $ totals included as facts",
      "Financial projections require verified studio history — currently More financial data required",
    ],
  };

  const happening = [
    hasAnalytics
      ? `Traffic and conversion are measured (${analytics.totals.uniqueSessions} sessions, ${analytics.totals.conversionRate}% conversion, 30d).`
      : "Analytics coverage is insufficient for a full traffic diagnosis.",
    metrics.attention.abandonedInquiries > 0
      ? `${metrics.attention.abandonedInquiries} booking inquiries are stale and need follow-up.`
      : "Inquiry follow-up queue is clear on abandoned markers.",
  ].join(" ");

  const why =
    metrics.attention.abandonedInquiries > 0 || (hasAnalytics && analytics.totals.conversionRate < 2)
      ? "Pipeline responsiveness and/or conversion efficiency is the primary constraint — dollar impact remains unverified."
      : "Protecting measurement quality and portfolio presence remains the priority.";

  const next =
    recommendations[0]?.title ||
    "Open Opportunities and Website Intelligence for the next evidence-graded action.";

  const executiveSummary = [
    happening,
    why,
    `Leadership focus first: ${next}.`,
    "This report separates Measured Facts, AI Analysis, Predictions, and Recommendations — nothing strategic auto-executes.",
    "Financial recovery figures and industry lift percentages are omitted unless measured or cited with source.",
  ]
    .slice(0, 5)
    .join(" ");

  return {
    version: 3,
    reportType,
    generatedAt: new Date().toISOString(),
    provider: "rules",
    executiveSummary,
    dashboard: dashboardScores,
    dataSources,
    layers: {
      measuredFacts: measuredSituation,
      aiAnalysis: rootCauses,
      verifiedExternalResearch: [
        {
          id: "live-web",
          summary:
            researchSnapshot?.executiveSummary ||
            "No verified live web research connected for this report. Internal knowledge remains higher priority than general web.",
          source: researchStatus?.connectorWired
            ? "Live web connector"
            : "Connector unavailable / research gated",
          publicationDate: researchSnapshot?.generatedAt ?? null,
          confidence:
            researchSnapshot?.confidence === "High"
              ? 80
              : researchSnapshot?.confidence === "Medium"
                ? 50
                : 0,
          present: Boolean(
            researchSnapshot?.status === "completed" &&
              (researchSnapshot.supportingSources?.length ?? 0) > 0
          ),
        },
      ],
      aiPredictions: predictions,
      recommendations,
    },
    measuredSituation,
    rootCauses,
    opportunities: reportOpportunities.slice(0, 8),
    risks: reportRisks.slice(0, 8),
    predictions,
    recommendations: recommendations.slice(0, 10),
    strategies,
    actionPlan,
    confidence,
    learningNote:
      "After approved actions complete, measure bookings, conversion, and SEO before/after. Score prediction accuracy. Retire recommendations that fail. Never repeat generic advice that outcomes disprove.",
    disclaimer: REPORT_V3_DISCLAIMER,
    ...(liveHealth ? { liveHealth } : {}),
    ...(intelligenceGraph ? { intelligenceGraph } : {}),
    ...(overnightBrief ? { overnightBrief } : {}),
    scenarioSimulation,
    executiveDebate,
    predictionValidations,
    selfAudit: reportSelfAudit,
  };
}
