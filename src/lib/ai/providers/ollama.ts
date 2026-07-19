import { randomUUID } from "node:crypto";
import { getAIConfig } from "../config";
import { logAIRequest } from "../log";
import type { AICompletionRequest, AICompletionResult, AIProvider } from "../types";

export class OllamaProvider implements AIProvider {
  id = "ollama" as const;
  model: string;

  constructor() {
    this.model = getAIConfig().ollama.model;
  }

  isConfigured() {
    const config = getAIConfig();
    // Default localhost URL is not a real deployment target unless explicitly opted in.
    return config.provider === "ollama" || Boolean(process.env.OLLAMA_BASE_URL);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const config = getAIConfig();
    const requestId = randomUUID();
    const startedAt = Date.now();
    const messages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content,
    }));

    try {
      const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(config.openrouter.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          ...(request.responseFormat === "json"
            ? { format: request.responseSchema?.schema ?? "json" }
            : {}),
        }),
      });
      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        await logAIRequest({
          requestId,
          task: request.task ?? "general",
          provider: "ollama",
          model: this.model,
          outcome: "failure",
          latencyMs,
          attempt: 1,
          status: res.status,
          jsonRequested: request.responseFormat === "json",
          error: `HTTP ${res.status}`,
        });
        return { content: "", finishReason: "error", provider: "ollama", model: this.model };
      }

      const data = await res.json();
      const content = data.message?.content ?? "";
      if (request.validateResponse) {
        try {
          if (!request.validateResponse(content)) throw new Error("Response validation returned false");
        } catch (error) {
          await logAIRequest({
            requestId,
            task: request.task ?? "general",
            provider: "ollama",
            model: this.model,
            outcome: "failure",
            latencyMs,
            attempt: 1,
            jsonRequested: request.responseFormat === "json",
            jsonValid: false,
            error: error instanceof Error ? error.message : String(error),
          });
          return { content: "", finishReason: "error", provider: "ollama", model: this.model };
        }
      }
      await logAIRequest({
        requestId,
        task: request.task ?? "general",
        provider: "ollama",
        model: this.model,
        outcome: "success",
        latencyMs,
        attempt: 1,
        jsonRequested: request.responseFormat === "json",
        jsonValid: request.responseFormat === "json" ? true : undefined,
      });
      return {
        content,
        finishReason: "stop",
        provider: "ollama",
        model: this.model,
        latencyMs,
        attempts: 1,
        visionUsed: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await logAIRequest({
        requestId,
        task: request.task ?? "general",
        provider: "ollama",
        model: this.model,
        outcome: "failure",
        latencyMs,
        attempt: 1,
        jsonRequested: request.responseFormat === "json",
        error: error instanceof Error ? error.message : String(error),
      });
      return { content: "", finishReason: "error", provider: "ollama", model: this.model };
    }
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<import("../types").AIStreamChunk> {
    const config = getAIConfig();
    const messages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.content,
    }));

    const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });

    if (!res.ok || !res.body) {
      yield { type: "error", error: "Ollama unavailable" };
      return;
    }

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
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) yield { type: "text", text: parsed.message.content };
        } catch {
          /* skip */
        }
      }
    }
    yield { type: "done" };
  }
}
