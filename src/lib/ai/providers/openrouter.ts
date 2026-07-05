import { getAIConfig } from "../config";
import type { AICompletionRequest, AICompletionResult, AIProvider, AIStreamChunk } from "../types";

export class OpenRouterProvider implements AIProvider {
  id = "openrouter" as const;
  model: string;

  constructor() {
    this.model = getAIConfig().openrouter.model;
  }

  isConfigured() {
    return !!getAIConfig().openrouter.apiKey;
  }

  private headers() {
    const config = getAIConfig();
    return {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.openrouter.siteUrl,
      "X-Title": "ÉLEVÉ Control",
    };
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const messages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content,
    }));

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      return { content: "", finishReason: "error", provider: "openrouter", model: this.model };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return { content, finishReason: "stop", provider: "openrouter", model: this.model };
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const messages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content,
    }));

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    if (!res.ok || !res.body) {
      yield { type: "error", error: "OpenRouter stream failed" };
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
    yield { type: "done" };
  }
}
