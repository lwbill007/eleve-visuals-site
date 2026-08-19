import { getAIConfig, isAIConfigured } from "./config";
import { logAIAction } from "./log";
import { getCached, setCache } from "./cache";
import { OllamaProvider } from "./providers/ollama";
import { isOpenRouterConfigured, openRouterComplete, openRouterStream } from "./providers/openrouter-client";
import type { AICompletionRequest, AICompletionResult, AIStreamChunk } from "./types";

const ollama = new OllamaProvider();

/**
 * Soft daily spend guard — read-then-write on a shared counter, not atomic.
 * Acceptable for a single-studio internal tool; not worth real infra for.
 */
async function checkAndIncrementDailyBudget(): Promise<boolean> {
  const cap = getAIConfig().dailyCallCap;
  const dayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = `ai-daily-call-count-${dayKey}`;
  const current = (await getCached<number>(cacheKey)) ?? 0;
  if (current >= cap) return false;
  await setCache(cacheKey, current + 1, 26 * 60 * 60 * 1000).catch(() => {});
  return true;
}

/** Provider-agnostic completion — callers never specify a model. */
export async function aiComplete(request: AICompletionRequest): Promise<AICompletionResult | null> {
  if (!isAIConfigured()) return null;
  if (!(await checkAndIncrementDailyBudget())) {
    await logAIAction(
      "ai_daily_budget_exceeded",
      "all",
      `Daily cap of ${getAIConfig().dailyCallCap} calls reached`
    );
    return null;
  }
  let lastFailure: AICompletionResult | null = null;

  if (isOpenRouterConfigured()) {
    const result = await openRouterComplete(request);
    if (result.finishReason !== "error") return result;
    lastFailure = result;
  }

  if (ollama.isConfigured()) {
    const result = await ollama.complete(request);
    if (result.finishReason !== "error") return result;
    lastFailure = result;
  }

  await logAIAction("ai_adapter_failed", "all", "No provider returned a result");
  return lastFailure;
}

/** Provider-agnostic streaming with automatic fallback to completion. */
export async function* aiStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
  if (!isAIConfigured()) {
    yield { type: "error", error: "AI not configured" };
    return;
  }
  if (!(await checkAndIncrementDailyBudget())) {
    await logAIAction(
      "ai_daily_budget_exceeded",
      "all",
      `Daily cap of ${getAIConfig().dailyCallCap} calls reached`
    );
    yield { type: "error", error: "Daily AI budget reached" };
    return;
  }

  if (isOpenRouterConfigured()) {
    let streamed = false;
    for await (const chunk of openRouterStream(request)) {
      if (chunk.type === "text") streamed = true;
      if (chunk.type === "error" && !streamed) break;
      yield chunk;
      if (chunk.type === "done") return;
    }
    if (streamed) {
      yield { type: "done" };
      return;
    }
  }

  if (ollama.isConfigured() && ollama.stream) {
    for await (const chunk of ollama.stream(request)) {
      yield chunk;
    }
    return;
  }

  const fallback = await aiComplete(request);
  if (fallback?.content) {
    yield { type: "text", text: fallback.content };
  } else {
    yield { type: "error", error: "AI unavailable" };
  }
  yield { type: "done" };
}

export function getActiveProviderLabel(): string {
  if (isOpenRouterConfigured()) return "openrouter";
  if (ollama.isConfigured()) return "ollama";
  return "rules";
}
