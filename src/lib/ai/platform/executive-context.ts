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

const CACHE_KEY = "executive-context-v1";
const CACHE_TTL_MS = 60_000;

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
  /** Overall data-trust score 0-100 combining verification, connectors, and truth freshness. */
  trustScore: number;
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
    trustScore: computeTrustScore(
      verification.verifiedPct,
      connectorList.length > 0 ? healthy / connectorList.length : 0,
      degradedMetricRatio
    ),
  };

  await setCache(CACHE_KEY, context, CACHE_TTL_MS);
  return context;
}
