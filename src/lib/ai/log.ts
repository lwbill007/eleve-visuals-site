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

export interface AIRequestTelemetry {
  requestId: string;
  task: string;
  provider: string;
  model: string;
  outcome: "success" | "failure" | "retry";
  latencyMs: number;
  attempt: number;
  status?: number;
  finishReason?: string;
  jsonRequested?: boolean;
  jsonValid?: boolean;
  vision?: boolean;
  cached?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}

/** Durable, queryable provider telemetry for the internal AI Health page. */
export async function logAIRequest(telemetry: AIRequestTelemetry): Promise<void> {
  await logAIAction(
    `ai_request_${telemetry.outcome}`,
    telemetry.model || telemetry.provider,
    JSON.stringify(telemetry)
  );
}
