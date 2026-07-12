/**
 * Build Executive Intelligence Report 2.0 from live ÉLEVÉ OS data.
 * Never invents ROI/conversion lifts; labels predictions explicitly.
 */

import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAllExecutiveOpportunities } from "../intelligence/website-opportunities";
import { getExecutiveRisks } from "../intelligence/risk-center";
import { buildWebsiteIntelligenceEngine } from "../intelligence/website-engine";
import { getAdminCRMContacts, getAdminDashboardOSCached } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import {
  REPORT_V2_DISCLAIMER,
  type ActionPlanBucket,
  type ExecutiveReportV2,
  type MeasuredMetric,
  type ReportConfidence,
  type ReportDataSource,
  type ReportHealthScore,
  type ReportOpportunity,
  type ReportRecommendation,
  type ReportRisk,
  type RootCauseHypothesis,
  type StrategyOption,
} from "./executive-report-v2";

function metric(
  id: string,
  label: string,
  value: string | null | undefined,
  note?: string
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
  return { id, label, value, truthKind: "Measured Data", note };
}

export async function buildExecutiveReportV2(
  reportType: string = "daily_ceo"
): Promise<ExecutiveReportV2> {
  const [
    metrics,
    analytics,
    opportunities,
    risks,
    website,
    dashboard,
    crm,
    portfolioCount,
  ] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getAllExecutiveOpportunities().catch(() => []),
    getExecutiveRisks().catch(() => []),
    buildWebsiteIntelligenceEngine().catch(() => null),
    getAdminDashboardOSCached(),
    getAdminCRMContacts(),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
  ]);

  const hasAnalytics = analytics.totals.pageviews > 0;
  const hasBookings = metrics.month.bookings > 0 || dashboard.metrics.bookings.pending > 0;

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
          : "No revenue signal MTD",
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
      present: false,
      detail: "Connector not wired",
    },
  ];

  const webCat = (id: string) => website?.categories.find((c) => c.id === id);

  const dashboardScores: ReportHealthScore[] = [
    {
      id: "overall",
      label: "Overall Business Health",
      score: hasAnalytics || hasBookings ? Math.round((
        (hasBookings ? 70 : 40) +
        (hasAnalytics ? Math.min(90, metrics.traffic.conversionRate * 20) : 30) +
        (metrics.revenue.monthChange >= 0 ? 75 : 55)
      ) / 3) : null,
      scoreLabel: hasAnalytics || hasBookings ? "Computed" : "Insufficient data",
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
      id: "marketing",
      label: "Marketing Health",
      score: hasAnalytics ? Math.min(90, 45 + analytics.totals.uniqueSessions / 10) : null,
      scoreLabel: hasAnalytics ? String(Math.min(90, Math.round(45 + analytics.totals.uniqueSessions / 10))) : "Not enough data",
      trend30d: "unknown",
      confidence: hasAnalytics ? 65 : 30,
      priority: "medium",
      truthKind: hasAnalytics ? "Measured Data" : "Unknown (More Data Required)",
    },
    {
      id: "website",
      label: "Website Health",
      score: webCat("conversion")?.score ?? null,
      scoreLabel: webCat("conversion")?.scoreLabel ?? "See Website Intelligence",
      trend30d: webCat("conversion")?.trend ?? "unknown",
      confidence: website?.confidence.overall ?? 40,
      priority: "high",
      truthKind: (webCat("conversion")?.truthKind as ReportHealthScore["truthKind"]) || "Unknown (More Data Required)",
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
      id: "portfolio",
      label: "Portfolio Health",
      score: portfolioCount > 0 ? Math.min(92, 40 + portfolioCount * 5) : null,
      scoreLabel: portfolioCount > 0 ? String(Math.min(92, 40 + portfolioCount * 5)) : "Empty",
      trend30d: "flat",
      confidence: 80,
      priority: portfolioCount < 6 ? "high" : "low",
      truthKind: "Measured Data",
    },
    {
      id: "seo",
      label: "SEO Health",
      score: webCat("seo")?.score ?? null,
      scoreLabel: webCat("seo")?.scoreLabel ?? "Not scanned",
      trend30d: webCat("seo")?.trend ?? "unknown",
      confidence: webCat("seo")?.confidence ?? 25,
      priority: "high",
      truthKind: (webCat("seo")?.truthKind as ReportHealthScore["truthKind"]) || "Unknown (More Data Required)",
    },
    {
      id: "customer_experience",
      label: "Customer Experience",
      score: null,
      scoreLabel: "Not measured",
      trend30d: "unknown",
      confidence: 20,
      priority: "medium",
      truthKind: "Unknown (More Data Required)",
    },
    {
      id: "brand",
      label: "Brand Strength",
      score: webCat("brand")?.score ?? null,
      scoreLabel: webCat("brand")?.scoreLabel ?? "AI qualitative",
      trend30d: "flat",
      confidence: webCat("brand")?.confidence ?? 50,
      priority: "medium",
      truthKind: "AI Analysis",
    },
    {
      id: "revenue",
      label: "Revenue Trend",
      score: null,
      scoreLabel:
        metrics.revenue.thisMonth > 0
          ? `$${metrics.revenue.thisMonth.toLocaleString()} MTD (${metrics.revenue.monthChange >= 0 ? "+" : ""}${metrics.revenue.monthChange}%)`
          : "Not enough data",
      trend30d:
        metrics.revenue.monthChange > 0
          ? "up"
          : metrics.revenue.monthChange < 0
            ? "down"
            : "unknown",
      confidence: metrics.revenue.thisMonth > 0 ? 70 : 30,
      priority: "high",
      truthKind: metrics.revenue.thisMonth > 0 ? "Measured Data" : "Unknown (More Data Required)",
    },
    {
      id: "growth",
      label: "Growth Trend",
      score: null,
      scoreLabel: "Requires longer history",
      trend30d: "unknown",
      confidence: 35,
      priority: "medium",
      truthKind: "AI Prediction",
    },
  ];

  // Fix overall scoreLabel when we have a number
  const overall = dashboardScores[0];
  if (overall.score != null) overall.scoreLabel = String(overall.score);

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
      "apv",
      "Avg Project Value (est.)",
      metrics.month.bookings > 0
        ? `~$${Math.round(metrics.revenue.thisMonth / Math.max(1, metrics.month.bookings)).toLocaleString()}`
        : null,
      "Derived from MTD revenue ÷ bookings — verify against payments"
    ),
    metric(
      "revenue_mtd",
      "Revenue MTD",
      metrics.revenue.thisMonth > 0 ? `$${metrics.revenue.thisMonth.toLocaleString()}` : null,
      "May include pipeline estimates depending on operator metrics source"
    ),
    metric("stale", "Stale Inquiries", String(metrics.attention.abandonedInquiries)),
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
      hypothesis: "Weak homepage trust signals or CTA hierarchy may reduce consultation requests.",
      confidence: 62,
      supportingEvidence: [
        `Measured conversion rate ${analytics.totals.conversionRate}% (30d)`,
        hasAnalytics ? "Traffic is present while conversion remains soft" : "",
      ].filter(Boolean),
      missingEvidence: ["Heatmaps unavailable", "Session recordings unavailable", "A/B test history unavailable"],
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
        `${metrics.attention.abandonedInquiries} inquiries marked abandoned/stale in CRM`,
      ],
      missingEvidence: ["Outbound email open rates", "Call attempt logs"],
      alternatives: ["Leads already booked elsewhere", "Spam / low-intent inquiries"],
    });
  }
  if (!hasAnalytics) {
    rootCauses.push({
      id: "measurement-gap",
      hypothesis: "Incomplete analytics coverage is limiting trustworthy diagnosis.",
      confidence: 95,
      supportingEvidence: ["First-party analytics returned insufficient traffic for 30d window"],
      missingEvidence: ["Pageview + conversion event stream"],
      alternatives: ["Tracking blocked in production", "Very new site with no volume yet"],
    });
  }

  const reportOpportunities: ReportOpportunity[] = opportunities.slice(0, 6).map((o, i) => ({
    id: o.id || `opp-${i}`,
    title: o.title,
    potentialImpact: o.urgency === "critical" || o.urgency === "high" ? "high" : "medium",
    confidence: Math.round((o.confidence || 0.65) * 100),
    dependencies: o.actions?.map((a) => a.label).slice(0, 2) || ["Review in Opportunities"],
    estimatedEffort: "medium",
    reasoning: o.detail || o.title,
    truthKind: "AI Analysis" as const,
  }));

  if (metrics.attention.abandonedInquiries > 0) {
    reportOpportunities.unshift({
      id: "recover-inquiries",
      title: "Recover stale booking inquiries",
      potentialImpact: "high",
      confidence: 88,
      dependencies: ["CRM follow-up capacity"],
      estimatedEffort: "low",
      reasoning: "Measured abandoned inquiries represent known demand still in pipeline.",
      truthKind: "Measured Data",
    });
  }

  const reportRisks: ReportRisk[] = risks.slice(0, 8).map((r, i) => ({
    id: r.id || `risk-${i}`,
    category: mapRiskCategory(r.category || r.title),
    title: r.title,
    level: mapLevel(r.severity),
    likelihood:
      typeof r.likelihood === "number"
        ? r.likelihood >= 0.75
          ? "High"
          : r.likelihood >= 0.45
            ? "Medium"
            : "Low"
        : mapLevel(r.severity),
    impact: mapLevel(r.severity),
    mitigation: r.mitigations?.[0]?.label || r.detail || "Review in Risks workspace",
    truthKind: "AI Analysis" as const,
  }));

  if (metrics.attention.abandonedInquiries > 3) {
    reportRisks.unshift({
      id: "pipeline-cool",
      category: "Business",
      title: "Warm pipeline cooling from delayed follow-up",
      level: "High",
      likelihood: "High",
      impact: "High",
      mitigation: "Work Booking Command Center queue within SLA today",
      truthKind: "Measured Data",
    });
  }

  const recommendations: ReportRecommendation[] = [];

  if (metrics.attention.abandonedInquiries > 0) {
    recommendations.push({
      id: "rec-stale",
      title: "Clear stale inquiry queue",
      priority: metrics.attention.abandonedInquiries > 3 ? "critical" : "high",
      businessImpact: 92,
      customerImpact: 70,
      effort: "low",
      confidence: 88,
      evidence: [
        {
          kind: "Measured Data",
          text: `${metrics.attention.abandonedInquiries} abandoned/stale inquiries in CRM`,
        },
      ],
      tradeoffs: ["Time away from new lead gen", "Risk of contacting already-closed leads"],
      dependencies: ["Booking inbox access"],
      successMetric: "Reduce stale inquiry count; response within SLA",
      owner: "Sales / Billy",
      status: "proposed",
      timeline: "Today",
      whyImportant: "Measured demand is aging in the pipeline.",
      assumptions: ["Inquiries are still reachable via email/phone"],
      missingInfo: ["Last outbound attempt timestamps per lead"],
      howReached: "Operator metrics abandoned inquiry count + CRM stage ages",
      ifNothingChanges: "Close likelihood declines and estimated pipeline value erodes",
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "assign", label: "Assign", href: "/admin/submissions?type=booking", requiresApproval: false },
        { id: "task", label: "Create Task", href: "/admin/submissions?type=booking", requiresApproval: false },
        { id: "follow", label: "Schedule Follow-up", href: "/admin/email", requiresApproval: true },
      ],
    });
  }

  if (hasAnalytics && analytics.totals.conversionRate < 2) {
    recommendations.push({
      id: "rec-cta",
      title: "Audit homepage CTA and trust signals",
      priority: "high",
      businessImpact: 78,
      customerImpact: 85,
      effort: "medium",
      confidence: 68,
      evidence: [
        {
          kind: "Measured Data",
          text: `Conversion rate ${analytics.totals.conversionRate}% over 30 days`,
        },
        {
          kind: "AI Analysis",
          text: "Soft conversion with traffic often correlates with CTA clarity or trust gaps",
        },
        {
          kind: "Industry Best Practice",
          text: "Luxury sites typically present one primary consultation CTA with proof above the fold",
        },
      ],
      tradeoffs: ["Aggressive CTAs can harm luxury positioning"],
      dependencies: ["Homepage CMS update"],
      successMetric: "Consultation/booking conversion rate; homepage → /book clicks",
      owner: "Marketing / Creative",
      status: "proposed",
      timeline: "This week",
      whyImportant: "Traffic is not converting proportionally.",
      assumptions: ["Traffic quality is comparable week over week"],
      missingInfo: ["Heatmaps", "Device split conversion"],
      howReached: "Measured conversion threshold + website intelligence heuristics",
      ifNothingChanges: "Acquisition cost rises relative to booked work",
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "modify", label: "Modify", href: "/admin/homepage", requiresApproval: false },
        { id: "plan", label: "Generate Implementation Plan", href: "/admin/website", requiresApproval: false },
      ],
    });
  }

  if (website && !website.dataSources.find((d) => d.id === "seo_scan")?.present) {
    recommendations.push({
      id: "rec-seo-scan",
      title: "Run platform SEO / content scan",
      priority: "high",
      businessImpact: 65,
      customerImpact: 30,
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
      whyImportant: "SEO recommendations stay speculative without a scan.",
      assumptions: [],
      missingInfo: ["On-page meta/heading inventory"],
      howReached: "Website Intelligence data-source check",
      ifNothingChanges: "SEO advice remains unlabeled speculation",
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        { id: "task", label: "Create Task", href: "/admin/memory", requiresApproval: false },
      ],
    });
  }

  // Pull top website recs as AI-labeled additions
  for (const wr of website?.recommendations.slice(0, 3) || []) {
    if (recommendations.some((r) => r.title === wr.title)) continue;
    recommendations.push({
      id: `web-${wr.id}`,
      title: wr.title,
      priority: wr.priority,
      businessImpact: wr.businessImpact,
      customerImpact: wr.uxImpact,
      effort: wr.implementationDifficulty,
      confidence: wr.confidence,
      evidence: wr.evidence.map((e) => ({
        kind: mapReportTruthKind(e.kind),
        text: e.text,
      })),
      tradeoffs: wr.potentialRisks,
      dependencies: wr.actions.filter((a) => a.href).map((a) => a.label),
      successMetric: wr.successMetrics[0] || "Track in Website Intelligence",
      owner: "Website / Marketing",
      status: "proposed",
      timeline: wr.estimatedMinutes <= 60 ? "This week" : "30 days",
      whyImportant: wr.whySeeingThis,
      assumptions: [],
      missingInfo: wr.evidence.filter((e) => e.kind.includes("Unknown")).map((e) => e.text),
      howReached: wr.reasoning,
      ifNothingChanges: wr.ifIgnored,
      actions: [
        { id: "approve", label: "Approve", requiresApproval: true },
        {
          id: "assign",
          label: "Assign",
          href: wr.actions.find((a) => a.href)?.href,
          requiresApproval: false,
        },
        { id: "reject", label: "Reject", requiresApproval: true },
      ],
    });
  }

  const strategies: StrategyOption[] = [
    {
      id: "conservative",
      label: "Conservative",
      summary: "Clear stale inquiries and confirm analytics — no public-site redesign yet.",
      risk: "Low",
      effort: "Low",
      potentialReward: "Protect existing pipeline without brand risk",
      dependencies: ["CRM follow-up"],
    },
    {
      id: "balanced",
      label: "Balanced",
      summary: "Recover pipeline + run SEO scan + refine homepage CTA with measured before/after.",
      risk: "Medium",
      effort: "Medium",
      potentialReward: "Improved conversion diagnosis with labeled experiments",
      dependencies: ["Homepage CMS", "Intelligence Refresh"],
    },
    {
      id: "aggressive",
      label: "Aggressive",
      summary: "Full website intelligence sprint: CTA rewrite, portfolio expansion, SEO fixes, a11y pass.",
      risk: "Higher brand/UX change risk",
      effort: "High",
      potentialReward: "Fastest learning loop if measurement is solid",
      dependencies: ["Creative capacity", "Analytics coverage", "SEO scan"],
    },
  ];

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
          title: "Review Website Intelligence category trends",
          owner: "Marketing",
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
          title: "Feed project outcomes into learning loops for future recommendations",
          owner: "CEO / Operations",
          truthKind: "AI Analysis",
        },
      ],
    },
  ];

  // Ensure today bucket isn't empty
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
    financial: metrics.revenue.thisMonth > 0 ? 70 : 35,
    creative: portfolioCount > 0 ? 60 : 40,
    overall: Math.round(
      ((hasBookings ? 80 : 45) +
        (hasAnalytics ? 65 : 35) +
        (webCat("seo")?.confidence ?? 30) +
        (metrics.revenue.thisMonth > 0 ? 70 : 35)) /
        4
    ),
    reasoning: [
      hasAnalytics ? "Website analytics measured" : "Analytics coverage incomplete — lowers overall confidence",
      hasBookings ? "Booking/CRM signals present" : "Limited booking volume",
      "Live web research and Lighthouse not connected — technical/SEO confidence capped",
      "No fabricated conversion or revenue lift claims included",
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
      ? "Pipeline and/or conversion efficiency is the primary business constraint right now."
      : "Protecting measurement quality and portfolio presence remains the priority.";

  const next =
    recommendations[0]?.title ||
    "Open Opportunities and Website Intelligence for the next evidence-graded action.";

  const executiveSummary = [
    happening,
    why,
    `Next: ${next}.`,
    "All scores and recommendations below distinguish Measured Data from AI Analysis and Predictions.",
    REPORT_V2_DISCLAIMER.split(". ")[0] + ".",
  ]
    .slice(0, 5)
    .join(" ");

  return {
    version: 2,
    reportType,
    generatedAt: new Date().toISOString(),
    provider: "rules",
    executiveSummary,
    dashboard: dashboardScores,
    dataSources,
    measuredSituation,
    rootCauses,
    opportunities: reportOpportunities.slice(0, 8),
    risks: reportRisks.slice(0, 8),
    recommendations: recommendations.slice(0, 10),
    strategies,
    actionPlan,
    confidence,
    disclaimer: REPORT_V2_DISCLAIMER,
  };
}

function mapRiskCategory(raw: string): ReportRisk["category"] {
  const s = raw.toLowerCase();
  if (/market|seo|content|campaign/.test(s)) return "Marketing";
  if (/tech|site|performance|access/.test(s)) return "Technical";
  if (/financ|revenue|cash/.test(s)) return "Financial";
  if (/ops|deliver|product/.test(s)) return "Operational";
  if (/brand/.test(s)) return "Brand";
  if (/client|cx|experience/.test(s)) return "Customer Experience";
  if (/legal|compliance|privacy/.test(s)) return "Legal / Compliance";
  return "Business";
}

function mapLevel(raw?: string): "Low" | "Medium" | "High" {
  const s = (raw || "medium").toLowerCase();
  if (s.includes("critical") || s.includes("high")) return "High";
  if (s.includes("low")) return "Low";
  return "Medium";
}

function mapReportTruthKind(kind: string): ReportRecommendation["evidence"][0]["kind"] {
  if (kind === "Measured Data") return "Measured Data";
  if (kind === "AI Analysis") return "AI Analysis";
  if (kind === "Industry Best Practice") return "Industry Best Practice";
  if (kind === "Verified External Research") return "Verified External Research";
  if (kind === "Estimated Opportunity" || kind === "AI Prediction") return "AI Prediction";
  return "Unknown (More Data Required)";
}
