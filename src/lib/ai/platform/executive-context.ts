/**
 * Executive Context — the single shared state every admin page consumes.
 *
 * Unifies Truth Layer + connector health + verification into one payload so
 * pages stop fanning out to 3 separate endpoints and every surface shows the
 * same honest numbers, confidence, and data-source health.
 */

import { resolveMetrics, type ResolvedMetrics } from "./truth-resolver";
import { getConnectorHealth } from "./connectors";
import { getVerificationStats } from "../memory/verification";
import { getCached, setCache } from "../cache";

const CACHE_KEY = "executive-context-v2";
const CACHE_TTL_MS = 60_000;

export type HealthLabel = "strong" | "steady" | "watch" | "critical" | "unknown";

export interface HealthDimension {
  score: number;
  label: HealthLabel;
  /** Human summary — honest about estimation vs verification. */
  note: string;
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
   * Composite business health dimensions. Every score is derived ONLY from
   * data already fetched for this payload (truth metrics + verification +
   * connectors) — no additional queries, so the fast context stays fast.
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
  /** Overall data-trust score 0-100 combining verification, connectors, and truth freshness. */
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

export async function getExecutiveContext(force = false): Promise<ExecutiveContext> {
  if (!force) {
    const cached = await getCached<ExecutiveContext>(CACHE_KEY);
    if (cached) return cached;
  }

  const [truth, connectorList, verification] = await Promise.all([
    resolveMetrics(force),
    Promise.resolve(getConnectorHealth()),
    getVerificationStats(),
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

  // Health dimensions — derived from already-fetched data (no extra queries).
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

  const headline =
    staleInquiries > 0
      ? `${staleInquiries} pending inquir${staleInquiries === 1 ? "y" : "ies"} need follow-up — sales recovery is the priority.`
      : revenueMtd > 0
        ? `Revenue tracking${revenueVerified ? " (verified)" : " (estimated from pipeline)"} · ${bookingsMtd} bookings MTD.`
        : `No settled revenue yet MTD · $${pipeline.toLocaleString()} open pipeline.`;

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
        revenueVerified ? "Verified revenue from settled payments" : "Estimated from pipeline deal values (Stripe disconnected)"
      ),
      sales: dim(
        salesScore,
        staleInquiries === 0 ? "No stale inquiries" : `${staleInquiries} inquiries awaiting response`
      ),
      growth: dim(
        growthScore,
        traffic30 > 0 ? `${traffic30.toLocaleString()} pageviews / 30d · ${conversion}% conversion` : "No traffic data"
      ),
      data: dim(dataScore, `${verification.verifiedPct}% knowledge verified · ${healthy}/${connectorList.length} sources healthy`),
    },
    headline,
    trustScore,
  };

  await setCache(CACHE_KEY, context, CACHE_TTL_MS);
  return context;
}
