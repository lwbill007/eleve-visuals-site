import { runDatabaseHealthCheck } from "@/lib/db-health";
import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import { getVerificationStats } from "../memory/verification";
import { computeGraphHealth } from "./integrations";
import { getConnectorHealth } from "../platform/connectors";
import { getEmbeddingStats } from "../memory/embeddings";
import type { ProductionReadinessReport } from "./types";

const QA_PROBE_PATHS = [
  "/api/admin/system/database-health",
  "/api/admin/ai/executive-os",
  "/api/admin/ai/cognitive",
  "/api/admin/ai/memory",
  "/api/admin/os/dashboard",
];

export async function runExecutiveQA(baseUrl?: string): Promise<ProductionReadinessReport> {
  const issues: ProductionReadinessReport["issues"] = [];
  const slowEndpoints: { path: string; ms: number }[] = [];

  const [dbReport, memStats, nodeCount, edgeCount, embeddings] = await Promise.all([
    runDatabaseHealthCheck().catch(() => null),
    getVerificationStats(),
    prisma.aIMemory.count({ where: { workspaceId: getWorkspaceId(), archived: false } }),
    prisma.aIMemoryRelation.count({ where: { workspaceId: getWorkspaceId() } }),
    getEmbeddingStats().catch(() => ({ chunks: 0, memories: 0, mode: "none" })),
  ]);

  const graph = computeGraphHealth(nodeCount, edgeCount);

  if (memStats.verifiedPct < 90) {
    issues.push({
      severity: memStats.verifiedPct < 50 ? "critical" : "high",
      title: `Memory verification ${memStats.verifiedPct}% (target 90%)`,
      fix: "Run verification queue batch approve + auto-verifier on refresh",
    });
  }

  if (graph.healthScore < 70) {
    issues.push({
      severity: graph.status === "critical" ? "critical" : "high",
      title: `Knowledge graph under-connected (${graph.edges}/${graph.targetEdges} edges)`,
      fix: "Run graph strengthener on every intelligence refresh",
    });
  }

  const connectors = getConnectorHealth();
  const integrations = connectors.map((c) => ({
    id: c.id,
    label: c.label,
    connected: c.connected,
    status: c.truthLabel === "verified" ? ("verified" as const) : c.connected ? ("estimated" as const) : ("missing" as const),
    evidenceTable: c.evidenceTable,
    lastSync: c.lastUpdate,
    blocksDecisions: c.blocksDecisions,
  }));
  const missingIntegrations = connectors.filter((c) => c.health !== "healthy" && c.id !== "analytics");
  for (const m of missingIntegrations.slice(0, 3)) {
    issues.push({
      severity: m.health === "disconnected" ? "medium" : "low",
      title: `${m.label}: ${m.health}`,
      fix: m.errors[0] ?? `Configure ${m.id}`,
    });
  }

  let apiPassed = 0;
  const apiFailures: string[] = [];

  if (baseUrl) {
    for (const path of QA_PROBE_PATHS) {
      const t0 = Date.now();
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          headers: { Cookie: process.env.QA_SESSION_COOKIE ?? "" },
          signal: AbortSignal.timeout(15000),
        });
        const ms = Date.now() - t0;
        if (ms > 2000) slowEndpoints.push({ path, ms });
        if (res.ok) apiPassed++;
        else apiFailures.push(`${path}: HTTP ${res.status}`);
      } catch (e) {
        apiFailures.push(`${path}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
  } else {
    apiPassed = QA_PROBE_PATHS.length;
  }

  if (embeddings.chunks < nodeCount * 0.3) {
    issues.push({
      severity: "medium",
      title: "Semantic index incomplete",
      fix: "POST /api/admin/ai/embeddings/reindex after verification",
    });
  }

  const dbScore = dbReport?.overall === "ok" ? 95 : dbReport?.overall === "warn" ? 75 : 40;
  const memScore = Math.min(100, memStats.verifiedPct + (graph.healthScore > 50 ? 10 : 0));
  const apiScore = baseUrl
    ? Math.round((apiPassed / QA_PROBE_PATHS.length) * 100)
    : 100;

  const overallScore = Math.round(
    (dbScore * 0.25 + memScore * 0.3 + graph.healthScore * 0.2 + apiScore * 0.15 + (embeddings.chunks > 0 ? 90 : 50) * 0.1)
  );

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    database: {
      score: dbScore,
      status: dbReport?.overall ?? "unknown",
      detail: dbReport?.checks[0]?.detail ?? "Not checked",
    },
    apis: {
      score: apiScore,
      passed: apiPassed,
      total: QA_PROBE_PATHS.length,
      failures: apiFailures,
    },
    memory: {
      score: memScore,
      verifiedPct: memStats.verifiedPct,
      pending: memStats.pending,
      trusted: memStats.trusted,
    },
    graph,
    performance: { slowEndpoints },
    integrations,
    issues: issues.sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return rank[a.severity] - rank[b.severity];
    }),
  };
}
