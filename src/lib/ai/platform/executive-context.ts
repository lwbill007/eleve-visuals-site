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

const CACHE_KEY = "executive-context-v4";
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
   * Composite business health dimensions. Derived from truth + verification +
   * connectors — no additional queries beyond the parallel fetch below.
   */
  health: {
    overall: HealthDimension;
    revenue: HealthDimension;
    sales: HealthDimension;
    growth: HealthDimension;
    data: HealthDimension;
  };
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
  return {
    id: r.id,
    title: r.title,
    why: r.whyNow || r.detail,
    evidence: r.evidence.slice(0, 3),
    estimatedRevenue: r.estimatedRevenue,
    confidence: r.confidence,
    timeMinutes: r.timeToCompleteMinutes,
    priority: r.priority,
    href: r.actions[0]?.href ?? "/admin/opportunities",
    actionLabel: r.actions[0]?.label ?? "Open",
    category: r.category,
  };
}

export async function getExecutiveContext(force = false): Promise<ExecutiveContext> {
  if (!force) {
    const cached = await getCached<ExecutiveContext>(CACHE_KEY);
    if (cached) return cached;
  }

  const [truth, connectorList, verification, guarded] = await Promise.all([
    resolveMetrics(force),
    Promise.resolve(getConnectorHealth()),
    getVerificationStats(),
    getGuardedRecommendations(8).catch(() => [] as Awaited<ReturnType<typeof getGuardedRecommendations>>),
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

  const revenueScore = revenueMtd > 0 ? 70 : pipeline > 0 ? 45 : 25;
  const salesScore = staleInquiries === 0 ? 80 : staleInquiries <= 2 ? 55 : 30;
  const growthScore = traffic30 > 0 ? Math.min(80, 40 + Math.min(40, conversion * 8)) : 30;
  const dataScore = trustScore;
  const overallScore = Math.round(
    revenueScore * 0.35 + salesScore * 0.3 + growthScore * 0.15 + dataScore * 0.2
  );

  const dim = (score: number, note: string): HealthDimension => ({
    score,
    label: labelFor(score),
    note,
  });

  const recommendations = guarded.filter((r) => !r.deprioritized).map(toNextAction);
  const nextAction = recommendations[0] ?? null;

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
      actionLabel: "Respond now",
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
      overall: dim(overallScore, headline),
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
    },
    headline,
    nextAction,
    recommendations,
    risks,
    trustScore,
  };

  await setCache(CACHE_KEY, context, CACHE_TTL_MS);
  return context;
}
