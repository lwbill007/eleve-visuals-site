import { prisma } from "@/lib/db";

export async function logAIAction(action: string, target: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: { actor: "ai", action, target, details: details.slice(0, 2000) },
    });
  } catch {
    /* non-blocking */
  }
}

/**
 * Structured telemetry for every AI request.
 * Required for router learning and AI Operations.
 */
export interface AIRequestTelemetry {
  requestId: string;
  task: string;
  provider: string;
  model: string;
  outcome: "success" | "failure" | "retry";
  latencyMs: number;
  /** 1-based attempt within the current model; totalAttempts covers model cascade. */
  attempt: number;
  retryCount?: number;
  status?: number;
  finishReason?: string;
  jsonRequested?: boolean;
  /** Parse / semantic validation success for structured outputs. */
  parseSuccess?: boolean;
  /** @deprecated Prefer parseSuccess — kept for existing health rollups. */
  jsonValid?: boolean;
  vision?: boolean;
  cacheHit?: boolean;
  cacheMiss?: boolean;
  /** True when a later model/provider in the cascade was used. */
  fallbackUsed?: boolean;
  /** Decomposed or scalar confidence when the caller has one. */
  confidence?: number;
  promptTokens?: number;
  completionTokens?: number;
  routingPolicy?: string;
  error?: string;
  /** Legacy alias — prefer cacheHit. */
  cached?: boolean;
}

/** Durable, queryable provider telemetry for the internal AI Health page. */
export async function logAIRequest(telemetry: AIRequestTelemetry): Promise<void> {
  const normalized: AIRequestTelemetry = {
    ...telemetry,
    parseSuccess: telemetry.parseSuccess ?? telemetry.jsonValid,
    jsonValid: telemetry.jsonValid ?? telemetry.parseSuccess,
    cacheHit: telemetry.cacheHit ?? telemetry.cached === true,
    cacheMiss:
      telemetry.cacheMiss ??
      (telemetry.cached === false ? true : telemetry.cached === true ? false : undefined),
    cached: telemetry.cached ?? telemetry.cacheHit,
  };
  await logAIAction(
    `ai_request_${normalized.outcome}`,
    normalized.model || normalized.provider,
    JSON.stringify(normalized)
  );
}
