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
  return messages.map((m) => ({
    role: m.role === "tool" ? ("user" as const) : m.role === "assistant" ? ("assistant" as const) : m.role,
    content: m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content,
  }));
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

export async function openRouterComplete(request: AICompletionRequest): Promise<AICompletionResult> {
  if (!isOpenRouterConfigured()) {
    return { content: "", finishReason: "error", provider: "openrouter", model: "" };
  }

  const config = getAIConfig();
  const models = config.openrouter.modelChain;
  let lastError = "";

  for (const model of models) {
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
          }),
        });

        if (!res.ok) {
          lastError = await res.text();
          if (shouldRetryStatus(res.status)) continue;
          break;
        }

        const data = await res.json();
        const toolCalls = parseToolCalls(data);
        const content = data.choices?.[0]?.message?.content ?? "";

        await logAIAction("openrouter_complete", model, `finish=${toolCalls?.length ? "tool_calls" : "stop"}`);

        return {
          content,
          toolCalls,
          finishReason: toolCalls?.length ? "tool_calls" : "stop",
          provider: "openrouter",
          model,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
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
