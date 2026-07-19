import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getConversionDashboard } from "@/lib/analytics-funnel";
import { getAdminPipeline } from "@/lib/admin-os-server";
import { getPaymentRevenueSummary, dollarsFromCents } from "@/lib/payments";
import { getMemory } from "../memory/store";
import { recommendExperiments } from "../marketing/experiment-engine";
import { METRIC_OWNERS, type MissingMetric } from "../platform/metric-owners";
import type { BusinessAction } from "../types";

export type RevenueFunnelStageId =
  | "traffic"
  | "portfolio"
  | "booking"
  | "inquiry"
  | "consultation"
  | "contract"
  | "deposit"
  | "completed"
  | "paid";

export interface RevenueFunnelStage {
  id: RevenueFunnelStageId;
  label: string;
  /** Measured count when known; null when the stage is MissingMetric. */
  count: number | null;
  /** Drop-off % from previous known stage; null if either side unknown. */
  dropOffPct: number | null;
  evidence: string[];
  potentialCause: string | null;
  confidence: number;
  /** Historical conversion outcome note, or null when unknown. */
  historicalOutcome: string | null;
  suggestedFix: BusinessAction | null;
  /** Dollar leak estimate — always AI Prediction unless paymentVerified. */
  estimatedLoss: number;
  lossTruthKind: "AI Prediction" | "Payments Verified" | "Unknown";
  missing: MissingMetric | null;
}

export interface RevenueLeak {
  id: string;
  title: string;
  reason: string;
  category:
    | "cta"
    | "booking_flow"
    | "navigation"
    | "performance"
    | "trust"
    | "seo"
    | "pricing"
    | "portfolio"
    | "follow_up"
    | "abandonment"
    | "engagement"
    | "upsell"
    | "retention"
    | "funnel";
  /** Heuristic only — always treat as AI Prediction, never ledger fact */
  estimatedLoss: number;
  recoveryPotential: number;
  confidence: number;
  evidence: string[];
  actions: BusinessAction[];
  truthKind: "AI Prediction";
  formula: string;
  financialDataSufficient: boolean;
  funnelStageId?: RevenueFunnelStageId;
}

function leak(
  partial: Omit<RevenueLeak, "id" | "truthKind" | "financialDataSufficient"> & {
    id?: string;
    financialDataSufficient?: boolean;
  }
): RevenueLeak {
  return {
    id: partial.id ?? `leak-${partial.category}-${partial.title.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`,
    truthKind: "AI Prediction",
    financialDataSufficient: partial.financialDataSufficient ?? false,
    ...partial,
  };
}

function dropOff(from: number | null, to: number | null): number | null {
  if (from == null || to == null || from <= 0) return null;
  return Math.round(((from - to) / from) * 1000) / 10;
}

function missingStage(
  label: string,
  reason: string,
  required: string[],
  unlockAfter: string,
  owner = METRIC_OWNERS.pipeline
): MissingMetric {
  return {
    label,
    reason,
    required,
    confidence: 0,
    unlockAfter,
    owner,
    unlockHref: "/admin/qa",
  };
}

/** Full Command funnel: Traffic → … → Paid. Every stage always present. */
export async function buildRevenueFunnel(): Promise<RevenueFunnelStage[]> {
  const [metrics, conversion, pipeline, payments] = await Promise.all([
    getOperatorMetrics(),
    getConversionDashboard(30).catch(() => null),
    getAdminPipeline(),
    getPaymentRevenueSummary(),
  ]);

  const col = (id: string) => pipeline.columns.find((c) => c.id === id)?.items.length ?? 0;

  const traffic = conversion?.visitors ?? metrics.traffic.visitors30 ?? null;
  const portfolio = conversion?.portfolioViews ?? null;
  const bookingStarts = conversion?.bookingStarts ?? null;
  const inquiries = conversion?.bookingCompletions ?? metrics.month.bookings ?? null;
  const consultation = col("discovery") + col("qualified");
  const contract = col("proposal");
  const deposit = col("booked");
  const completed = col("delivered") + col("editing") + col("production");
  const paidCount = payments.hasPayments ? payments.count : null;
  const paidDollars = payments.hasPayments ? dollarsFromCents(payments.totalCents) : null;

  const stages: Array<{
    id: RevenueFunnelStageId;
    label: string;
    count: number | null;
    evidence: string[];
    potentialCause: string | null;
    confidence: number;
    historicalOutcome: string | null;
    suggestedFix: BusinessAction | null;
    estimatedLoss: number;
    lossTruthKind: RevenueFunnelStage["lossTruthKind"];
    missing: MissingMetric | null;
  }> = [
    {
      id: "traffic",
      label: "Traffic",
      count: traffic != null && traffic > 0 ? traffic : traffic === 0 ? 0 : null,
      evidence:
        traffic != null
          ? [`${traffic.toLocaleString()} unique visitors / 30d (Measured · Analytics)`]
          : [],
      potentialCause: traffic === 0 ? "No recent site traffic recorded" : null,
      confidence: traffic != null ? 0.95 : 0,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-traffic",
        label: "Open Analytics",
        type: "navigate",
        href: "/admin/analytics",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing:
        traffic == null
          ? missingStage(
              "Traffic",
              "Visitor count unavailable from Analytics owner",
              ["Analytics events with sessionId", "Pageview tracking active"],
              "Unlock after Analytics records pageviews",
              METRIC_OWNERS.analytics
            )
          : null,
    },
    {
      id: "portfolio",
      label: "Portfolio",
      count: portfolio,
      evidence:
        portfolio != null
          ? [`${portfolio.toLocaleString()} portfolio views / 30d (Measured)`]
          : [],
      potentialCause:
        traffic != null && portfolio != null && traffic > 0 && portfolio / traffic < 0.15
          ? "Low homepage → portfolio transition"
          : null,
      confidence: portfolio != null ? 0.9 : 0,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-portfolio",
        label: "Review portfolio",
        type: "navigate",
        href: "/admin/portfolio",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing:
        portfolio == null
          ? missingStage(
              "Portfolio views",
              "Portfolio funnel events not available",
              ["Funnel event portfolio_viewed or /portfolio pageviews"],
              "Unlock after Analytics funnel instrumentation",
              METRIC_OWNERS.analytics
            )
          : null,
    },
    {
      id: "booking",
      label: "Booking",
      count: bookingStarts,
      evidence:
        bookingStarts != null
          ? [`${bookingStarts.toLocaleString()} booking starts / 30d (Measured)`]
          : [],
      potentialCause:
        portfolio != null &&
        bookingStarts != null &&
        portfolio > 20 &&
        bookingStarts / portfolio < 0.05
          ? "Weak portfolio → /book CTA"
          : null,
      confidence: bookingStarts != null ? 0.88 : 0,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-book",
        label: "Review booking flow",
        type: "navigate",
        href: "/book",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing:
        bookingStarts == null
          ? missingStage(
              "Booking starts",
              "Booking-start funnel events missing",
              ["Funnel event booking_started or /book pageviews"],
              "Unlock after booking funnel tracking",
              METRIC_OWNERS.analytics
            )
          : null,
    },
    {
      id: "inquiry",
      label: "Inquiry",
      count: inquiries,
      evidence:
        inquiries != null
          ? [
              `${inquiries} booking inquiries / 30d (Measured)`,
              metrics.attention.abandonedInquiries > 0
                ? `${metrics.attention.abandonedInquiries} stale inquiries (Measured)`
                : "No stale inquiries",
            ]
          : [],
      potentialCause:
        bookingStarts != null &&
        inquiries != null &&
        bookingStarts > 5 &&
        inquiries / bookingStarts < 0.25
          ? "Form friction between start and submit"
          : metrics.attention.abandonedInquiries > 0
            ? "Inquiries idle without response"
            : null,
      confidence: inquiries != null ? 0.92 : 0,
      historicalOutcome:
        metrics.attention.abandonedInquiries > 0
          ? `${metrics.attention.abandonedInquiries} inquiries went stale historically in current open set`
          : null,
      suggestedFix: {
        id: "fix-inquiry",
        label: "Review inquiries",
        type: "navigate",
        href: "/admin/submissions?type=booking",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing:
        inquiries == null
          ? missingStage(
              "Inquiries",
              "Booking submission count unavailable",
              ["Submission rows type=booking"],
              "Unlock after bookings are recorded",
              METRIC_OWNERS.bookings
            )
          : null,
    },
    {
      id: "consultation",
      label: "Consultation",
      count: consultation,
      evidence: [
        `${consultation} in Discovery/Qualified (Measured · Pipeline)`,
        "Consultation = Creative Consultation stages in pipeline",
      ],
      potentialCause:
        (inquiries ?? 0) > 3 && consultation === 0
          ? "Inquiries not advancing to consultation"
          : null,
      confidence: 0.85,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-consult",
        label: "Open pipeline",
        type: "navigate",
        href: "/admin/pipeline",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing: null,
    },
    {
      id: "contract",
      label: "Contract",
      count: contract,
      evidence: [`${contract} in Proposal (Measured · Pipeline)`],
      potentialCause:
        consultation > 2 && contract === 0
          ? "Consultations not converting to proposals"
          : null,
      confidence: 0.8,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-contract",
        label: "Open pipeline",
        type: "navigate",
        href: "/admin/pipeline",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing: null,
    },
    {
      id: "deposit",
      label: "Deposit",
      count: deposit,
      evidence: [
        `${deposit} Booked / retainer stage (Measured · Pipeline)`,
        "Deposit stage uses booked status — Stripe deposit linkage may still be missing",
      ],
      potentialCause:
        contract > 1 && deposit === 0 ? "Proposals stalling before retainer" : null,
      confidence: 0.75,
      historicalOutcome: null,
      suggestedFix: {
        id: "fix-deposit",
        label: "Open payments",
        type: "navigate",
        href: "/admin/payments",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing: null,
    },
    {
      id: "completed",
      label: "Completed",
      count: completed,
      evidence: [
        `${completed} in production/editing/delivered (Measured · Pipeline)`,
      ],
      potentialCause:
        metrics.attention.galleriesAwaiting > 0
          ? `${metrics.attention.galleriesAwaiting} booked projects idle 14+ days`
          : null,
      confidence: 0.8,
      historicalOutcome:
        metrics.attention.galleriesAwaiting > 0
          ? "Delivery backlog present in current booked set"
          : null,
      suggestedFix: {
        id: "fix-completed",
        label: "Review bookings",
        type: "navigate",
        href: "/admin/submissions?type=booking",
      },
      estimatedLoss: 0,
      lossTruthKind: "Unknown",
      missing: null,
    },
    {
      id: "paid",
      label: "Paid",
      count: paidCount,
      evidence: payments.hasPayments
        ? [
            `${payments.count} succeeded Payment rows (Payments Verified)`,
            `$${Math.round(paidDollars ?? 0).toLocaleString()} lifetime settled`,
            `$${Math.round(dollarsFromCents(payments.thisMonthCents)).toLocaleString()} MTD settled`,
          ]
        : [],
      potentialCause: !payments.hasPayments
        ? "No Stripe Payment rows yet — cash stage cannot be verified"
        : deposit > 0 && payments.thisMonthCents === 0
          ? "Booked work without settled payments MTD"
          : null,
      confidence: payments.hasPayments ? 0.98 : 0,
      historicalOutcome: payments.hasPayments
        ? `Lifetime settled $${Math.round(paidDollars ?? 0).toLocaleString()} (Payments Verified)`
        : null,
      suggestedFix: {
        id: "fix-paid",
        label: "Open payments",
        type: "navigate",
        href: "/admin/payments",
      },
      estimatedLoss: 0,
      lossTruthKind: payments.hasPayments ? "Payments Verified" : "Unknown",
      missing: !payments.hasPayments
        ? missingStage(
            "Paid",
            "No verified Payment rows — dollar losses cannot be ledger-backed",
            ["Stripe webhook writing Payment rows", "At least one succeeded payment"],
            "Unlock after Payments records settled charges",
            METRIC_OWNERS.financial_center
          )
        : null,
    },
  ];

  // Attach drop-offs between consecutive measured stages
  let prevCount: number | null = null;
  return stages.map((stage) => {
    const drop = dropOff(prevCount, stage.count);
    if (stage.count != null) prevCount = stage.count;
    // Soft AI Prediction loss only when drop-off is severe AND we refuse dollar invention without payments
    let estimatedLoss = 0;
    let lossTruthKind = stage.lossTruthKind;
    if (
      stage.id === "inquiry" &&
      metrics.attention.abandonedInquiries > 0 &&
      !payments.hasPayments
    ) {
      // Qualitative only — keep $ at 0
      estimatedLoss = 0;
      lossTruthKind = "Unknown";
    }
    return {
      ...stage,
      dropOffPct: drop,
      estimatedLoss,
      lossTruthKind,
    };
  });
}

/** Continuously detect where revenue is being lost across the business. */
export async function detectRevenueLeaks(
  funnelOverride?: RevenueFunnelStage[]
): Promise<RevenueLeak[]> {
  const [metrics, analytics, websiteHealth, funnel] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getMemory("marketing", "executive_report", "website-health").catch(() => null),
    funnelOverride ? Promise.resolve(funnelOverride) : buildRevenueFunnel(),
  ]);

  const leaks: RevenueLeak[] = [];

  // Stage pressure leaks (MissingMetric honesty lives on the funnel stages, not duplicated here)
  for (const stage of funnel) {
    if (stage.missing) continue;

    if (stage.potentialCause && (stage.dropOffPct == null || stage.dropOffPct >= 40)) {
      leaks.push(
        leak({
          id: `leak-funnel-${stage.id}`,
          title: `${stage.label} funnel pressure`,
          reason: stage.potentialCause,
          category: "funnel",
          funnelStageId: stage.id,
          estimatedLoss: 0,
          recoveryPotential: 0,
          confidence: stage.confidence,
          formula:
            stage.lossTruthKind === "Payments Verified"
              ? "Payments-verified stage — still no invented incremental loss"
              : "Dollar leakage omitted — More financial data / Payments verification required",
          evidence: [
            ...stage.evidence,
            stage.dropOffPct != null ? `${stage.dropOffPct}% drop-off from prior stage` : "Drop-off not computable",
            stage.historicalOutcome ?? "No historical outcome recorded for this stage",
          ],
          actions: stage.suggestedFix ? [stage.suggestedFix] : [],
        })
      );
    }
  }

  if (metrics.attention.abandonedInquiries > 0) {
    leaks.push(
      leak({
        id: "leak-stale-inquiries",
        title: `${metrics.attention.abandonedInquiries} stale booking inquiries`,
        reason: "Inquiries without response for 3+ days — leads may go cold before consultation",
        category: "follow_up",
        funnelStageId: "inquiry",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.7,
        formula: "No $ projection — Payments verification required before loss estimates",
        evidence: [
          `${metrics.attention.abandonedInquiries} untouched inquiries (Measured)`,
          "AI Prediction dollars intentionally omitted — not studio-verified recovery",
        ],
        actions: [
          { id: "submissions", label: "Review inquiries", type: "navigate", href: "/admin/submissions?type=booking" },
          { id: "automations", label: "Set up follow-up", type: "navigate", href: "/admin/automations" },
        ],
      })
    );
  }

  if (metrics.attention.followUpClients > 0) {
    leaks.push(
      leak({
        title: `${metrics.attention.followUpClients} inactive clients (historical CRM value present)`,
        reason: "Past clients with no activity in 60+ days — repeat risk is real; $ recovery is unknown",
        category: "retention",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.7,
        formula: "No $ projection — historical CRM value is not the same as recoverable revenue",
        financialDataSufficient: false,
        evidence: [
          `${metrics.attention.followUpClients} clients need follow-up (Measured)`,
          metrics.attention.followUpValue > 0
            ? `Historical CRM value associated: $${metrics.attention.followUpValue.toLocaleString()} (Historical — not predicted recovery)`
            : "More financial data required for recovery projection",
        ],
        actions: [
          { id: "crm", label: "Open CRM", type: "navigate", href: "/admin/crm" },
          { id: "marketing", label: "Re-engagement campaign", type: "navigate", href: "/admin/marketing?task=follow_up" },
        ],
      })
    );
  }

  if (metrics.traffic.conversionRate < 2.5 && metrics.traffic.visitors30 > 30) {
    leaks.push(
      leak({
        title: "Conversion soft relative to common studio ranges",
        reason: `Site converts at ${metrics.traffic.conversionRate}% (Measured). Gap-to-benchmark dollars are not computed — external benchmarks are unverified for this studio.`,
        category: "booking_flow",
        funnelStageId: "booking",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.5,
        formula: "Dollar gap intentionally omitted — More financial data / verified benchmark required",
        evidence: [
          `${metrics.traffic.visitors30} visitors (30d) (Measured)`,
          `${metrics.traffic.conversionRate}% conversion (Measured)`,
          `Top page: ${metrics.traffic.topPage}`,
          "Industry Best Practice: some studios cite ~2.5–4% — not verified for ÉLEVÉ; not used as $ math",
        ],
        actions: [
          { id: "analytics", label: "View analytics", type: "navigate", href: "/admin/analytics" },
          { id: "opportunities", label: "View opportunities", type: "navigate", href: "/admin/opportunities" },
        ],
      })
    );
  }

  const healthValue = (websiteHealth?.value ?? {}) as {
    issues?: { title: string; severity: string }[];
    overallHealthScore?: number;
  };
  if (typeof healthValue.overallHealthScore === "number" && healthValue.overallHealthScore < 70) {
    leaks.push(
      leak({
        title: "Website health below target",
        reason: "Platform intelligence scan detected SEO, UX, or content gaps that may reduce qualified inquiries",
        category: "seo",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.55,
        formula: "No $ projection from health score alone",
        evidence: [
          `Health score: ${healthValue.overallHealthScore}/100 (AI Analysis / scan)`,
          ...(healthValue.issues?.filter((i) => i.severity === "high").map((i) => i.title) ?? []),
        ],
        actions: [
          { id: "memory", label: "Refresh intelligence", type: "navigate", href: "/admin/memory" },
        ],
      })
    );
  }

  const topPage = analytics.topPages[0];
  if (topPage && topPage.views > 50) {
    const hasBookingPath = analytics.topPages.some((p) => p.path.includes("/book"));
    if (!hasBookingPath && topPage.path.startsWith("/portfolio")) {
      leaks.push(
        leak({
          title: "High-traffic portfolio without conversion path",
          reason: `${topPage.path} drives ${topPage.views} views (Measured) but may lack strong booking CTA`,
          category: "cta",
          funnelStageId: "portfolio",
          estimatedLoss: 0,
          recoveryPotential: 0,
          confidence: 0.55,
          formula: "Dollar leakage omitted — More financial data required",
          evidence: [`${topPage.views} views on ${topPage.path} (Measured)`, "No /book in top pages"],
          actions: [
            { id: "portfolio", label: "Edit portfolio", type: "navigate", href: "/admin/portfolio" },
          ],
        })
      );
    }
  }

  if (metrics.attention.galleriesAwaiting > 0) {
    leaks.push(
      leak({
        title: `${metrics.attention.galleriesAwaiting} booked projects idle 14+ days`,
        reason: "Delayed delivery may risk satisfaction and referrals — $ impact unknown",
        category: "retention",
        funnelStageId: "completed",
        estimatedLoss: 0,
        recoveryPotential: 0,
        confidence: 0.65,
        formula: "No $ projection without verified referral/satisfaction data",
        evidence: [`${metrics.attention.galleriesAwaiting} idle booked projects (Measured)`],
        actions: [
          { id: "submissions", label: "View bookings", type: "navigate", href: "/admin/submissions?type=booking" },
        ],
      })
    );
  }

  return leaks.sort((a, b) => b.confidence - a.confidence || b.recoveryPotential - a.recoveryPotential);
}

export async function getExperimentBacklog() {
  const experiments = await recommendExperiments();
  return experiments
    .map((e) => ({
      ...e,
      expectedRoi: Math.round(e.confidence * 100),
    }))
    .sort((a, b) => b.expectedRoi - a.expectedRoi);
}

export function totalLeakExposure(leaks: RevenueLeak[]): {
  loss: number;
  recoverable: number;
  truthKind: "AI Prediction";
  disclaimer: string;
  financialDataSufficient: boolean;
} {
  const loss = leaks.reduce((s, l) => s + l.estimatedLoss, 0);
  const recoverable = leaks.reduce((s, l) => s + l.recoveryPotential * l.confidence, 0);
  return {
    loss,
    recoverable,
    truthKind: "AI Prediction",
    financialDataSufficient: false,
    disclaimer:
      loss > 0 || recoverable > 0
        ? "AI Prediction only — heuristic coefficients, not audited recoverable revenue. Do not cite as fact."
        : "More financial data required — exposure shown as qualitative funnel risks without invented dollars. Stages always visible; unknowns use MissingMetric unlock criteria.",
  };
}
