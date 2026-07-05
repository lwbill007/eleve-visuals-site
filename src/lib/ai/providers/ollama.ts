import { getAIConfig } from "../config";
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
    const messages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.role === "tool" ? `[Tool: ${m.toolName}]\n${m.content}` : m.content,
    }));

    const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });

    if (!res.ok) {
      return { content: "", finishReason: "error", provider: "ollama", model: this.model };
    }

    const data = await res.json();
    return {
      content: data.message?.content ?? "",
      finishReason: "stop",
      provider: "ollama",
      model: this.model,
    };
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
