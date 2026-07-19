import { prisma } from "@/lib/db";
import { getConfiguredProviders } from "./config";
import type { AIRequestTelemetry } from "./log";
import { getOpenRouterRoutingSnapshot } from "./providers/openrouter-model-router";

interface ModelHealth {
  model: string;
  requests: number;
  successes: number;
  failures: number;
  retries: number;
  successRate: number;
  averageLatencyMs: number;
  jsonSuccessRate: number | null;
  visionSuccessRate: number | null;
  promptTokens: number;
  completionTokens: number;
  lastError: string | null;
  lastSuccessAt: string | null;
}

function parseTelemetry(details: string): AIRequestTelemetry | null {
  try {
    const value = JSON.parse(details) as AIRequestTelemetry;
    return value && typeof value.model === "string" ? value : null;
  } catch {
    return null;
  }
}

function percentage(numerator: number, denominator: number): number {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

export async function getAIHealthSnapshot() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [logs, cachedEvaluations, cachedRequests, routing] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        actor: "ai",
        action: { startsWith: "ai_request_" },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 2_000,
    }),
    prisma.applicationEvaluation.count().catch(() => 0),
    prisma.aICache
      .count({ where: { key: { startsWith: "applicant-evaluation:" }, expiresAt: { gt: new Date() } } })
      .catch(() => 0),
    getOpenRouterRoutingSnapshot(),
  ]);

  const parsed = logs.flatMap((log) => {
    const telemetry = parseTelemetry(log.details);
    return telemetry ? [{ telemetry, createdAt: log.createdAt }] : [];
  });
  const byModel = new Map<string, typeof parsed>();
  for (const row of parsed) {
    const values = byModel.get(row.telemetry.model) ?? [];
    values.push(row);
    byModel.set(row.telemetry.model, values);
  }

  const models: ModelHealth[] = [...byModel.entries()]
    .map(([model, rows]) => {
      const successes = rows.filter((row) => row.telemetry.outcome === "success");
      const failures = rows.filter((row) => row.telemetry.outcome === "failure");
      const retries = rows.filter((row) => row.telemetry.outcome === "retry");
      const completed = successes.length + failures.length;
      const jsonRows = rows.filter((row) => row.telemetry.jsonValid !== undefined);
      const jsonSuccesses = jsonRows.filter((row) => row.telemetry.jsonValid === true);
      const visionRows = rows.filter((row) => row.telemetry.vision);
      const visionSuccesses = visionRows.filter(
        (row) => row.telemetry.outcome === "success"
      );
      const lastFailure = rows.find(
        (row) => row.telemetry.outcome !== "success" && row.telemetry.error
      );
      return {
        model,
        requests: rows.length,
        successes: successes.length,
        failures: failures.length,
        retries: retries.length,
        successRate: percentage(successes.length, completed),
        averageLatencyMs: successes.length
          ? Math.round(
              successes.reduce((sum, row) => sum + row.telemetry.latencyMs, 0) /
                successes.length
            )
          : 0,
        jsonSuccessRate: jsonRows.length
          ? percentage(jsonSuccesses.length, jsonRows.length)
          : null,
        visionSuccessRate: visionRows.length
          ? percentage(visionSuccesses.length, visionRows.length)
          : null,
        promptTokens: rows.reduce((sum, row) => sum + (row.telemetry.promptTokens ?? 0), 0),
        completionTokens: rows.reduce(
          (sum, row) => sum + (row.telemetry.completionTokens ?? 0),
          0
        ),
        lastError: lastFailure?.telemetry.error ?? null,
        lastSuccessAt: successes[0]?.createdAt.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.successes - a.successes || b.successRate - a.successRate);

  const successes = parsed.filter((row) => row.telemetry.outcome === "success");
  const failures = parsed.filter((row) => row.telemetry.outcome === "failure");
  const retries = parsed.filter((row) => row.telemetry.outcome === "retry");
  const completed = successes.length + failures.length;
  const jsonAttempts = parsed.filter((row) => row.telemetry.jsonValid !== undefined);
  const jsonSuccesses = jsonAttempts.filter((row) => row.telemetry.jsonValid === true);
  const visionAttempts = parsed.filter((row) => row.telemetry.vision);
  const visionSuccesses = successes.filter((row) => row.telemetry.vision);
  const lastError = parsed.find(
    (row) => row.telemetry.outcome !== "success" && row.telemetry.error
  );

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    providers: getConfiguredProviders(),
    activeModel: successes[0]?.telemetry.model ?? null,
    lastSuccessfulModel: successes[0]?.telemetry.model ?? null,
    totals: {
      requests: parsed.length,
      successes: successes.length,
      failures: failures.length,
      retries: retries.length,
      successRate: percentage(successes.length, completed),
      failureRate: percentage(failures.length, completed),
      averageLatencyMs: successes.length
        ? Math.round(
            successes.reduce((sum, row) => sum + row.telemetry.latencyMs, 0) /
              successes.length
          )
        : 0,
      jsonParseSuccessRate: percentage(jsonSuccesses.length, jsonAttempts.length),
      visionSuccessRate: percentage(visionSuccesses.length, visionAttempts.length),
      promptTokens: parsed.reduce((sum, row) => sum + (row.telemetry.promptTokens ?? 0), 0),
      completionTokens: parsed.reduce(
        (sum, row) => sum + (row.telemetry.completionTokens ?? 0),
        0
      ),
      cachedEvaluations,
      cachedRequests,
    },
    models,
    routing,
    lastProviderError: lastError
      ? {
          at: lastError.createdAt.toISOString(),
          model: lastError.telemetry.model,
          error: lastError.telemetry.error,
        }
      : null,
    retryHistory: retries.slice(0, 25).map((row) => ({
      at: row.createdAt.toISOString(),
      task: row.telemetry.task,
      model: row.telemetry.model,
      latencyMs: row.telemetry.latencyMs,
      error: row.telemetry.error ?? null,
    })),
  };
}

export type AIHealthSnapshot = Awaited<ReturnType<typeof getAIHealthSnapshot>>;
