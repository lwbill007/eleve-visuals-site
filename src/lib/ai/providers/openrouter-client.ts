import { getAIConfig } from "../config";
import { logAIAction } from "../log";
import type { AICompletionRequest, AICompletionResult, AIStreamChunk, AIToolCall } from "../types";

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

function formatMessages(messages: AICompletionRequest["messages"]) {
  return messages.map((m) => {
    const role = m.role === "tool" ? ("user" as const) : m.role === "assistant" ? ("assistant" as const) : m.role;
    const text = m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content;
    return {
      role,
      content:
        m.images?.length && m.role === "user"
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
  return status === 429 || status === 502 || status === 503 || status === 504;
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
  const hasImages = request.messages.some((message) => message.images?.length);
  const models = hasImages
    ? [
        config.openrouter.visionModel,
        ...config.openrouter.modelChain.filter(
          (model) => model !== config.openrouter.visionModel
        ),
      ]
    : config.openrouter.modelChain;
  let lastError = "";

  for (const model of models) {
    // If a model rejects JSON mode (e.g. 400 unsupported parameter), retry it
    // once without response_format before moving down the chain.
    let useJsonMode = request.responseFormat === "json";

    for (let attempt = 0; attempt <= config.openrouter.maxRetries; attempt++) {
      if (attempt > 0) await sleep(config.openrouter.retryDelayMs * attempt);

      try {
        await throttle();
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            model,
            messages: formatMessages(request.messages),
            tools: formatTools(request.tools),
            tool_choice: request.tools?.length ? "auto" : undefined,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 2048,
            ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status}: ${await res.text()}`;
          console.error(
            `[openrouter] model=${model} jsonMode=${useJsonMode} status=${res.status} body=${lastError.slice(0, 500)}`
          );
          if (useJsonMode && res.status >= 400 && res.status < 500 && res.status !== 429) {
            useJsonMode = false;
            attempt -= 1; // retry the same model immediately without JSON mode
            continue;
          }
          if (shouldRetryStatus(res.status)) continue;
          break;
        }

        const data = await res.json();
        const toolCalls = parseToolCalls(data);
        const choice = data.choices?.[0];
        const content = extractContent(choice?.message?.content);
        const nativeFinishReason: string =
          choice?.native_finish_reason ?? choice?.finish_reason ?? "unknown";

        if (!content && !toolCalls?.length) {
          lastError = `Empty completion (finish_reason=${nativeFinishReason}) from ${model}`;
          console.error(
            `[openrouter] model=${model} returned empty content. finish_reason=${nativeFinishReason} raw=${JSON.stringify(data).slice(0, 500)}`
          );
          continue;
        }

        await logAIAction(
          "openrouter_complete",
          model,
          `finish=${nativeFinishReason} chars=${content.length} jsonMode=${useJsonMode}`
        );
        if (nativeFinishReason === "length") {
          console.warn(
            `[openrouter] model=${model} completion was truncated at max_tokens=${request.maxTokens ?? 2048}`
          );
        }

        return {
          content,
          toolCalls,
          finishReason: toolCalls?.length ? "tool_calls" : "stop",
          nativeFinishReason,
          provider: "openrouter",
          model,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[openrouter] model=${model} request failed: ${lastError}`);
      }
    }
  }

  await logAIAction("openrouter_error", "all_models", lastError.slice(0, 200));
  return { content: "", finishReason: "error", provider: "openrouter", model: models[0] ?? "" };
}

export async function* openRouterStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
  if (!isOpenRouterConfigured()) {
    yield { type: "error", error: "OpenRouter not configured" };
    return;
  }

  const config = getAIConfig();
  const models = config.openrouter.modelChain;

  for (const model of models) {
    try {
      await throttle();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model,
          messages: formatMessages(request.messages),
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

      await logAIAction("openrouter_stream", model, "done");
      yield { type: "done" };
      return;
    } catch {
      /* try next model */
    }
  }

  yield { type: "error", error: "All OpenRouter models unavailable" };
}
