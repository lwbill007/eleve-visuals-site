import { randomUUID } from "node:crypto";
import { getAIConfig } from "../config";
import { logAIAction, logAIRequest } from "../log";
import { getTaskSpec } from "../tasks/registry";
import type { AICompletionRequest, AICompletionResult, AIStreamChunk, AIToolCall } from "../types";
import {
  recordOpenRouterModelResult,
  resolveRoutingTask,
  routeOpenRouterModels,
} from "./openrouter-model-router";

let lastRequestAt = 0;

async function throttle() {
  const { minIntervalMs } = getAIConfig().openrouter;
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < minIntervalMs) {
    await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
  }
  lastRequestAt = Date.now();
}

function headers() {
  const config = getAIConfig();
  return {
    Authorization: `Bearer ${config.openrouter.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": config.openrouter.siteUrl,
    "X-Title": "ÉLEVÉ Control",
  };
}

function formatMessages(messages: AICompletionRequest["messages"], includeImages = true) {
  return messages.map((m) => {
    const role = m.role === "tool" ? ("user" as const) : m.role === "assistant" ? ("assistant" as const) : m.role;
    const text = m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content;
    return {
      role,
      content:
        includeImages && m.images?.length && m.role === "user"
          ? [
              { type: "text" as const, text },
              ...m.images.slice(0, 8).map((url) => ({
                type: "image_url" as const,
                image_url: { url },
              })),
            ]
          : text,
    };
  });
}

function formatTools(tools?: AICompletionRequest["tools"]) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function parseToolCalls(raw: unknown): AIToolCall[] | undefined {
  const message = (raw as { choices?: { message?: { tool_calls?: unknown[] } }[] })?.choices?.[0]?.message;
  const calls = message?.tool_calls;
  if (!Array.isArray(calls) || calls.length === 0) return undefined;

  return calls.map((call, i) => {
    const c = call as {
      id?: string;
      function?: { name?: string; arguments?: string };
    };
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(c.function?.arguments || "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }
    return {
      id: c.id || `call_${i}`,
      name: c.function?.name || "unknown",
      arguments: args,
    };
  });
}

function shouldRetryStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504, 520, 522, 524, 529].includes(status);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export function isOpenRouterConfigured(): boolean {
  return !!getAIConfig().openrouter.apiKey;
}

/** Validates the API key against OpenRouter (not the public /models list). */
export async function probeOpenRouterKey(): Promise<{ ok: boolean; error?: string }> {
  if (!isOpenRouterConfigured()) {
    return { ok: false, error: "OPENROUTER_API_KEY not set" };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: headers() });
    if (res.ok) return { ok: true };

    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const detail = data.error?.message || res.statusText;

    if (res.status === 401) {
      return {
        ok: false,
        error: "Invalid OPENROUTER_API_KEY — OpenRouter rejected the key (401 User not found)",
      };
    }

    return { ok: false, error: `OpenRouter auth failed (${res.status}): ${detail}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "OpenRouter unreachable" };
  }
}

/** Some providers return message content as an array of typed parts. */
function extractContent(rawContent: unknown): string {
  if (typeof rawContent === "string") return rawContent;
  if (Array.isArray(rawContent)) {
    return rawContent
      .map((part) => {
        if (typeof part === "string") return part;
        const block = part as { type?: string; text?: string };
        return typeof block?.text === "string" ? block.text : "";
      })
      .join("");
  }
  return "";
}

export async function openRouterComplete(request: AICompletionRequest): Promise<AICompletionResult> {
  if (!isOpenRouterConfigured()) {
    return { content: "", finishReason: "error", provider: "openrouter", model: "" };
  }

  const config = getAIConfig();
  const task = resolveRoutingTask(request);
  const taskSpec = getTaskSpec(task);
  const maxRetries = Math.max(config.openrouter.maxRetries, taskSpec.maxRetries);
  const hasImages =
    request.messages.some((message) => message.images?.length) || taskSpec.visionRequired;
  const models = await routeOpenRouterModels({ ...request, task });
  const requestId = randomUUID();
  let lastError = "";
  let totalAttempts = 0;
  let modelIndex = 0;
  let freeQuotaExhausted = false;

  modelLoop: for (const model of models) {
    if (freeQuotaExhausted && model.free) {
      modelIndex += 1;
      continue;
    }
    const usedFallback = modelIndex > 0;
    let useStructuredOutput = Boolean(
      request.responseSchema &&
        request.responseFormat === "json" &&
        model.structuredOutputs
    );
    let useJsonMode = Boolean(
      request.responseFormat === "json" && (model.jsonMode || model.source === "configured")
    );

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (totalAttempts >= config.openrouter.maxAttempts) break modelLoop;
      if (attempt > 0) await sleep(config.openrouter.retryDelayMs * attempt);
      totalAttempts += 1;
      const startedAt = Date.now();
      const baseTelemetry = {
        requestId,
        task,
        provider: "openrouter" as const,
        model: model.id,
        attempt: totalAttempts,
        retryCount: Math.max(0, totalAttempts - 1),
        jsonRequested: request.responseFormat === "json" || taskSpec.structuredOutputRequired,
        vision: hasImages && model.vision,
        fallbackUsed: usedFallback,
        routingPolicy: config.routingPolicy,
        cacheHit: false,
        cacheMiss: true,
      };

      try {
        await throttle();
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: headers(),
          signal: AbortSignal.timeout(config.openrouter.timeoutMs),
          body: JSON.stringify({
            model: model.id,
            messages: formatMessages(request.messages, !hasImages || model.vision),
            tools: formatTools(request.tools),
            tool_choice: request.tools?.length ? "auto" : undefined,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 2048,
            ...(useStructuredOutput && request.responseSchema
              ? {
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: request.responseSchema.name,
                      strict: true,
                      schema: request.responseSchema.schema,
                    },
                  },
                  provider: { require_parameters: true },
                }
              : useJsonMode
                ? { response_format: { type: "json_object" } }
                : {}),
          }),
        });
        const latencyMs = Date.now() - startedAt;

        if (!res.ok) {
          lastError = `HTTP ${res.status}: ${await res.text()}`;
          console.error(
            `[openrouter] request=${requestId} model=${model.id} structured=${useStructuredOutput} jsonMode=${useJsonMode} status=${res.status} body=${lastError.slice(0, 1000)}`
          );
          recordOpenRouterModelResult(model.id, { ok: false, latencyMs });
          await logAIRequest({
            ...baseTelemetry,
            outcome: shouldRetryStatus(res.status) ? "retry" : "failure",
            latencyMs,
            status: res.status,
            error: lastError.slice(0, 500),
          });
          // A shared free-model quota applies across models. Skip the remaining
          // free chain, but still allow any configured paid fallback to run.
          if (
            res.status === 429 &&
            /free-models-per-day|free-models-per-min/i.test(lastError)
          ) {
            freeQuotaExhausted = true;
            break;
          }
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            if (useStructuredOutput) {
              // Downgrade strict schema → JSON mode on the same model.
              useStructuredOutput = false;
              useJsonMode = model.jsonMode || model.source === "configured";
              attempt -= 1;
              continue;
            }
            if (useJsonMode) {
              // Last same-model fallback is prompt-only JSON.
              useJsonMode = false;
              attempt -= 1;
              continue;
            }
          }
          if (shouldRetryStatus(res.status)) continue;
          break;
        }

        const data = await res.json();
        // Raw provider response is written before content extraction/validation.
        console.info(
          `[openrouter] Raw response | request=${requestId} | model=${model.id} | status=${res.status}\n${JSON.stringify(data)}`
        );
        const toolCalls = parseToolCalls(data);
        const choice = data.choices?.[0];
        const content = extractContent(choice?.message?.content);
        const nativeFinishReason: string =
          choice?.native_finish_reason ?? choice?.finish_reason ?? "unknown";
        const usage = data.usage as
          | { prompt_tokens?: number; completion_tokens?: number }
          | undefined;

        if (!content && !toolCalls?.length) {
          lastError = `Empty completion (finish_reason=${nativeFinishReason}) from ${model.id}`;
          console.error(
            `[openrouter] request=${requestId} model=${model.id} returned empty content. finish_reason=${nativeFinishReason}`
          );
          recordOpenRouterModelResult(model.id, { ok: false, latencyMs });
          continue;
        }

        if (nativeFinishReason === "length" || nativeFinishReason === "error") {
          lastError = `Completion ended with finish_reason=${nativeFinishReason}`;
          recordOpenRouterModelResult(model.id, { ok: false, latencyMs });
          await logAIRequest({
            ...baseTelemetry,
            outcome: "retry",
            latencyMs,
            finishReason: nativeFinishReason,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            error: lastError,
          });
          continue;
        }

        let responseValid = true;
        let parseSuccess: boolean | undefined;
        if (request.responseFormat === "json" && !toolCalls?.length) {
          try {
            JSON.parse(content);
            parseSuccess = true;
          } catch {
            parseSuccess = false;
            responseValid = false;
            lastError = "Structured JSON parse failed";
          }
        }
        if (responseValid && request.validateResponse && !toolCalls?.length) {
          try {
            responseValid = request.validateResponse(content);
            if (!responseValid) lastError = "Response validator rejected the completion";
            if (request.responseFormat === "json") parseSuccess = responseValid;
          } catch (error) {
            responseValid = false;
            parseSuccess = false;
            lastError = error instanceof Error ? error.message : String(error);
          }
        }
        if (!responseValid) {
          console.error(
            `[openrouter] request=${requestId} model=${model.id} semantic validation failed: ${lastError}`
          );
          recordOpenRouterModelResult(model.id, {
            ok: false,
            latencyMs,
            jsonValid: parseSuccess,
          });
          await logAIRequest({
            ...baseTelemetry,
            outcome: "retry",
            latencyMs,
            finishReason: nativeFinishReason,
            parseSuccess: false,
            jsonValid: false,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            error: lastError.slice(0, 500),
          });
          break;
        }

        await logAIAction(
          "openrouter_complete",
          model.id,
          `finish=${nativeFinishReason} chars=${content.length} structured=${useStructuredOutput} jsonMode=${useJsonMode}`
        );
        recordOpenRouterModelResult(model.id, {
          ok: true,
          latencyMs,
          jsonValid: parseSuccess,
        });
        await logAIRequest({
          ...baseTelemetry,
          outcome: "success",
          latencyMs,
          status: res.status,
          finishReason: nativeFinishReason,
          parseSuccess,
          jsonValid: parseSuccess,
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
        });

        return {
          content,
          toolCalls,
          finishReason: toolCalls?.length ? "tool_calls" : "stop",
          nativeFinishReason,
          provider: "openrouter",
          model: model.id,
          latencyMs,
          attempts: totalAttempts,
          visionUsed: hasImages && model.vision,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        const latencyMs = Date.now() - startedAt;
        console.error(
          `[openrouter] request=${requestId} model=${model.id} request failed: ${lastError}`,
          err
        );
        recordOpenRouterModelResult(model.id, { ok: false, latencyMs });
        await logAIRequest({
          ...baseTelemetry,
          outcome: attempt < maxRetries ? "retry" : "failure",
          latencyMs,
          error: lastError.slice(0, 500),
        });
      }
    }
    modelIndex += 1;
  }

  await logAIAction("openrouter_error", "all_models", lastError.slice(0, 200));
  return {
    content: "",
    finishReason: "error",
    error: lastError || "No OpenRouter model returned a usable completion",
    provider: "openrouter",
    model: models[0]?.id ?? "",
    attempts: totalAttempts,
  };
}

export async function* openRouterStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
  if (!isOpenRouterConfigured()) {
    yield { type: "error", error: "OpenRouter not configured" };
    return;
  }

  const config = getAIConfig();
  const models = await routeOpenRouterModels({ ...request, task: request.task ?? "chat" });
  const hasImages = request.messages.some((message) => message.images?.length);

  for (const model of models) {
    const startedAt = Date.now();
    try {
      await throttle();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: headers(),
        signal: AbortSignal.timeout(config.openrouter.timeoutMs),
        body: JSON.stringify({
          model: model.id,
          messages: formatMessages(request.messages, !hasImages || model.vision),
          stream: true,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2048,
        }),
      });

      if (!res.ok || !res.body) continue;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield { type: "text", text: delta };
          } catch {
            /* skip */
          }
        }
      }

      const latencyMs = Date.now() - startedAt;
      recordOpenRouterModelResult(model.id, { ok: true, latencyMs });
      await logAIAction("openrouter_stream", model.id, `done latencyMs=${latencyMs}`);
      yield { type: "done" };
      return;
    } catch (error) {
      recordOpenRouterModelResult(model.id, {
        ok: false,
        latencyMs: Date.now() - startedAt,
      });
      console.error(`[openrouter] stream model=${model.id} failed:`, error);
    }
  }

  yield { type: "error", error: "All OpenRouter models unavailable" };
}
