/**
 * Executive Context — the single shared state every admin page consumes.
 *
 * Unifies Truth Layer + connector health + verification + the top guarded
 * recommendation so every module answers: "What should I do next?"
 */

import { resolveMetrics, type ResolvedMetrics } from "./truth-resolver";
import { getConnectorHealth } from "./connectors";
import { getVerificationStats } from "../memory/verification";
import { getGuardedRecommendations } from "../truth/recommendation-guardrails";
import { getCached, setCache } from "../cache";
import { buildConfidencePanel } from "./confidence-panel";
import { detectRevenueLeaks, totalLeakExposure } from "../executive/revenue-leaks";
import { getPaymentRevenueSummary } from "@/lib/payments";

const CACHE_KEY = "executive-context-v8";
const CACHE_TTL_MS = 60_000;

export type HealthLabel = "strong" | "steady" | "watch" | "critical" | "unknown";

export interface HealthDimension {
  score: number;
  label: HealthLabel;
  /** Human summary — honest about estimation vs verification. */
  note: string;
}

/** Compact next-action card shared across every admin page. */
export interface NextAction {
  id: string;
  title: string;
  why: string;
  evidence: string[];
  estimatedRevenue: number;
  confidence: number;
  timeMinutes: number;
  priority: string;
  href: string;
  actionLabel: string;
  category: string;
  /** Adapter kind for one-click execute (inferred when omitted). */
  executeKind?: string;
}

/** Risk signal derived from truth/connectors/verification — no fabricated alerts. */
export interface RiskSignal {
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  href: string;
  actionLabel: string;
}

export interface ExecutiveContext {
  generatedAt: string;
  truth: ResolvedMetrics;
  connectors: {
    total: number;
    healthy: number;
    degraded: number;
    disconnected: number;
    degradedLabels: string[];
    blockedDecisions: string[];
  };
  verification: {
    total: number;
    verifiedPct: number;
    targetPct: number;
    pending: number;
    verified: number;
    trusted: number;
  };
  /**
   * Category business health. Each score documents its note (formula evidence).
   * Overall is a weighted blend — never an opaque vanity number alone.
   */
  health: {
    overall: HealthDimension;
    revenue: HealthDimension;
    sales: HealthDimension;
    growth: HealthDimension;
    data: HealthDimension;
    finance: HealthDimension;
    marketing: HealthDimension;
    website: HealthDimension;
    operations: HealthDimension;
    brand: HealthDimension;
  };
  /** Multi-factor confidence panel for the current posture. */
  confidence: {
    band: "high" | "medium" | "low" | "blocked";
    composite: number;
    factors: { id: string; label: string; score: number; weight: number; note: string }[];
    blockers: string[];
  };
  /** Revenue leak exposure from detector (estimated recovery). */
  leaks: {
    loss: number;
    recoverable: number;
    count: number;
  };
  /**
   * Non-fatal subsystem failures while building context.
   * UI should show uncertainty — never pretend empty means healthy.
   */
  partialErrors?: { source: string; message: string }[];
  /** One-line executive headline summarizing current posture. */
  headline: string;
  /** The single highest-impact next action (guarded recommendations). */
  nextAction: NextAction | null;
  /** Ranked recommendation queue for Opportunity Center + Home. */
  recommendations: NextAction[];
  /** Derived risk signals for Risk Center + Home. */
  risks: RiskSignal[];
  /** Overall data-trust score 0-100. */
  trustScore: number;
}

function labelFor(score: number): HealthLabel {
  if (score >= 75) return "strong";
  if (score >= 55) return "steady";
  if (score >= 35) return "watch";
  return "critical";
}

function computeTrustScore(
  verifiedPct: number,
  connectorHealthyRatio: number,
  degradedMetricRatio: number
): number {
  const verificationWeight = 0.5;
  const connectorWeight = 0.3;
  const truthWeight = 0.2;
  const score =
    verifiedPct * verificationWeight +
    connectorHealthyRatio * 100 * connectorWeight +
    (1 - degradedMetricRatio) * 100 * truthWeight;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function toNextAction(
  r: Awaited<ReturnType<typeof getGuardedRecommendations>>[number]
): NextAction {
  const href = r.actions[0]?.href ?? "/admin/opportunities";
  const id = r.id.toLowerCase();
  let executeKind = "navigate";
  // Only batch-mark when the recommendation is explicitly about stale inquiries —
  // booking inbox links must navigate, not mutate every aging lead.
  if (id.includes("stale")) {
    executeKind = "mark_stale_bookings_contacted";
  } else if (href.includes("/admin/pipeline")) {
    executeKind = "open_pipeline";
  } else if (href.includes("/admin/applications")) {
    executeKind = "open_applications";
  } else if (href.includes("/admin/memory")) {
    executeKind = "open_memory_verify";
  } else if (href.includes("/admin/qa") || href.includes("/admin/payments")) {
    executeKind = "open_payments_trust";
  }

  const actionLabel =
    executeKind === "mark_stale_bookings_contacted"
      ? "Mark contacted"
      : executeKind === "open_memory_verify"
        ? "Verify"
        : executeKind === "open_payments_trust"
          ? "Fix sources"
          : (r.actions[0]?.label ?? "Execute");

  return {
    id: r.id,
    title: r.title,
    why: r.whyNow || r.detail,
    evidence: r.evidence.slice(0, 3),
    estimatedRevenue: r.estimatedRevenue,
    confidence: r.confidence,
    timeMinutes: r.timeToCompleteMinutes,
    priority: r.priority,
    href,
    actionLabel,
    category: r.category,
    executeKind,
  };
}

export async function getExecutiveContext(force = false): Promise<ExecutiveContext> {
  if (!force) {
    const cached = await getCached<ExecutiveContext>(CACHE_KEY);
    if (cached) return cached;
  }

  const partialErrors: { source: string; message: string }[] = [];

  const [truth, connectorList, verification, guarded, leakList, payments] = await Promise.all([
    resolveMetrics(force),
    Promise.resolve(getConnectorHealth()),
    getVerificationStats(),
    getGuardedRecommendations(8).catch((e: unknown) => {
      partialErrors.push({
        source: "recommendations",
        message: e instanceof Error ? e.message : "Recommendations unavailable",
      });
      return [] as Awaited<ReturnType<typeof getGuardedRecommendations>>;
    }),
    detectRevenueLeaks().catch((e: unknown) => {
      partialErrors.push({
        source: "leaks",
        message: e instanceof Error ? e.message : "Leak detector unavailable",
      });
      return [];
    }),
    getPaymentRevenueSummary().catch((e: unknown) => {
      partialErrors.push({
        source: "payments",
        message: e instanceof Error ? e.message : "Payment summary unavailable",
      });
      return {
        hasPayments: false,
        count: 0,
        todayCents: 0,
        thisMonthCents: 0,
        lastMonthCents: 0,
        totalCents: 0,
      };
    }),
  ]);

  const healthy = connectorList.filter((c) => c.health === "healthy").length;
  const degraded = connectorList.filter((c) => c.health === "degraded").length;
  const disconnected = connectorList.filter(
    (c) => c.health === "disconnected" || c.health === "error"
  ).length;
  const degradedLabels = connectorList
    .filter((c) => c.health !== "healthy" && c.blocksDecisions.length > 0)
    .map((c) => c.label);
  const blockedDecisions = Array.from(
    new Set(connectorList.flatMap((c) => (c.health !== "healthy" ? c.blocksDecisions : [])))
  );

  const metricValues = Object.values(truth.metrics);
  const degradedMetrics = metricValues.filter(
    (m) => m.label === "estimated" || m.label === "unknown"
  ).length;
  const degradedMetricRatio = metricValues.length > 0 ? degradedMetrics / metricValues.length : 0;

  const trustScore = computeTrustScore(
    verification.verifiedPct,
    connectorList.length > 0 ? healthy / connectorList.length : 0,
    degradedMetricRatio
  );

  const m = truth.metrics;
  const num = (v: number | string | undefined) => (typeof v === "number" ? v : 0);

  const staleInquiries = num(m["attention.staleInquiries"]?.value);
  const bookingsMtd = num(m["bookings.mtd"]?.value);
  const revenueMtd = num(m["revenue.mtd"]?.value);
  const pipeline = num(m["revenue.pipeline"]?.value);
  const revenueVerified = m["revenue.mtd"]?.label === "verified";
  const conversion = num(m["conversion.rate"]?.value);
  const traffic30 = num(m["traffic.30d"]?.value);

  const revenueScore = revenueVerified
    ? revenueMtd > 0
      ? 85
      : 50
    : revenueMtd > 0
      ? 55
      : pipeline > 0
        ? 40
        : 25;
  const salesScore = staleInquiries === 0 ? 80 : staleInquiries <= 2 ? 55 : 30;
  const growthScore = traffic30 > 0 ? Math.min(80, 40 + Math.min(40, conversion * 8)) : 30;
  const dataScore = trustScore;
  const financeScore = payments.hasPayments
    ? Math.min(90, 55 + Math.min(35, payments.count * 5))
    : revenueVerified
      ? 60
      : 28;
  const marketingScore = growthScore;
  const websiteScore =
    conversion > 2 ? 70 : conversion > 0 ? 50 : traffic30 > 0 ? 40 : 25;
  const operationsScore =
    staleInquiries === 0 && verification.verifiedPct >= 40
      ? 75
      : staleInquiries <= 2
        ? 50
        : 30;
  const brandScore = Math.min(
    80,
    35 + (num(m["sessions.applications"]?.value) > 0 ? 20 : 0) + (bookingsMtd > 0 ? 15 : 0)
  );
  const overallScore = Math.round(
    revenueScore * 0.12 +
      financeScore * 0.13 +
      salesScore * 0.15 +
      marketingScore * 0.1 +
      websiteScore * 0.1 +
      operationsScore * 0.1 +
      brandScore * 0.08 +
      dataScore * 0.12 +
      growthScore * 0.1
  );

  const dim = (score: number, note: string): HealthDimension => ({
    score,
    label: labelFor(score),
    note,
  });

  const recommendations = guarded.filter((r) => !r.deprioritized).map(toNextAction);
  const nextAction = recommendations[0] ?? null;

  const leakExposure = totalLeakExposure(leakList);
  const confidence = buildConfidencePanel({
    verifiedDataPct: verification.verifiedPct,
    historicalFit: Math.min(100, recommendations.length * 12 + 30),
    externalSourcesPct: connectorList.length > 0 ? (healthy / connectorList.length) * 100 : 0,
    predictionStability: 70,
    knowledgeCoverage: Math.min(100, verification.verifiedPct + 10),
    missingInfoPenalty: degradedMetricRatio * 100,
    blockers: [
      ...(!payments.hasPayments && !revenueVerified ? ["Settled payments missing"] : []),
      ...(verification.verifiedPct < 20 && verification.total > 20
        ? ["Knowledge verification below 20%"]
        : []),
    ],
  });

  const risks: RiskSignal[] = [];
  if (staleInquiries > 0) {
    risks.push({
      id: "risk-stale-inquiries",
      title: `${staleInquiries} stale booking inquir${staleInquiries === 1 ? "y" : "ies"}`,
      detail: "Leads waiting 3+ days without a response — conversion probability drops daily.",
      severity: staleInquiries >= 3 ? "critical" : "high",
      evidence: [
        `Truth metric attention.staleInquiries = ${staleInquiries}`,
        "Source: Submission table (verified count)",
      ],
      href: "/admin/submissions?type=booking",
      actionLabel: "Mark contacted",
    });
  }
  if (revenueMtd === 0 && pipeline > 0) {
    risks.push({
      id: "risk-zero-revenue",
      title: "No settled revenue MTD with open pipeline",
      detail: `$${pipeline.toLocaleString()} in estimated pipeline — sales recovery before marketing spend.`,
      severity: "high",
      evidence: [
        revenueVerified ? "Revenue verified at $0" : "Revenue estimated at $0 (Stripe disconnected)",
        `Open pipeline: $${pipeline.toLocaleString()}`,
      ],
      href: "/admin/pipeline",
      actionLabel: "Open pipeline",
    });
  }
  if (verification.verifiedPct < 50 && verification.total > 20) {
    risks.push({
      id: "risk-unverified-memory",
      title: `Knowledge only ${verification.verifiedPct}% verified`,
      detail: "AI recommendations may rely on unverified memories — review the verification queue.",
      severity: verification.verifiedPct < 20 ? "high" : "medium",
      evidence: [
        `${verification.pending} memories pending`,
        `Target: ${verification.targetPct}%`,
      ],
      href: "/admin/memory",
      actionLabel: "Verify knowledge",
    });
  }
  for (const label of degradedLabels.slice(0, 3)) {
    risks.push({
      id: `risk-connector-${label.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${label} disconnected or degraded`,
      detail: "External intelligence incomplete — decisions that depend on this source are blocked or estimated.",
      severity: "medium",
      evidence: blockedDecisions.slice(0, 2),
      href: "/admin/qa",
      actionLabel: "Check connectors",
    });
  }

  const headline =
    nextAction?.title ??
    (staleInquiries > 0
      ? `${staleInquiries} pending inquir${staleInquiries === 1 ? "y" : "ies"} need follow-up — sales recovery is the priority.`
      : revenueMtd > 0
        ? `Revenue tracking${revenueVerified ? " (verified)" : " (estimated from pipeline)"} · ${bookingsMtd} bookings MTD.`
        : `No settled revenue yet MTD · $${pipeline.toLocaleString()} open pipeline.`);

  const context: ExecutiveContext = {
    generatedAt: new Date().toISOString(),
    truth,
    connectors: {
      total: connectorList.length,
      healthy,
      degraded,
      disconnected,
      degradedLabels,
      blockedDecisions,
    },
    verification: {
      total: verification.total,
      verifiedPct: verification.verifiedPct,
      targetPct: verification.targetPct,
      pending: verification.pending,
      verified: verification.verified,
      trusted: verification.trusted,
    },
    health: {
      overall: dim(
        overallScore,
        "Weighted: Sales 15% · Finance 13% · Revenue 12% · Data 12% · Marketing/Growth/Website/Ops/Brand"
      ),
      revenue: dim(
        revenueScore,
        revenueVerified
          ? "Verified revenue from settled payments"
          : "Estimated from pipeline deal values (Stripe disconnected)"
      ),
      sales: dim(
        salesScore,
        staleInquiries === 0 ? "No stale inquiries" : `${staleInquiries} inquiries awaiting response`
      ),
      growth: dim(
        growthScore,
        traffic30 > 0
          ? `${traffic30.toLocaleString()} pageviews / 30d · ${conversion}% conversion`
          : "No traffic data"
      ),
      data: dim(
        dataScore,
        `${verification.verifiedPct}% knowledge verified · ${healthy}/${connectorList.length} sources healthy`
      ),
      finance: dim(
        financeScore,
        payments.hasPayments
          ? `${payments.count} settled Payment row(s)`
          : "No Payment rows — cash truth incomplete"
      ),
      marketing: dim(marketingScore, "Derived from traffic + conversion until email/ads connect"),
      website: dim(
        websiteScore,
        conversion > 0 ? `${conversion}% conversion` : "Conversion unknown or zero"
      ),
      operations: dim(
        operationsScore,
        staleInquiries === 0 ? "Inbox clear" : "Follow-up debt present"
      ),
      brand: dim(brandScore, "Sessions applications + booking momentum proxy"),
    },
    confidence,
    leaks: {
      loss: Math.round(leakExposure.loss),
      recoverable: Math.round(leakExposure.recoverable),
      count: leakList.length,
    },
    partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
    headline,
    nextAction,
    recommendations,
    risks,
    trustScore,
  };

  await setCache(CACHE_KEY, context, CACHE_TTL_MS);
  return context;
}
