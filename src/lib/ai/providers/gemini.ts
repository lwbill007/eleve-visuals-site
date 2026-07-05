import { getAIConfig } from "../config";
import type { AICompletionRequest, AICompletionResult, AIProvider, AIStreamChunk } from "../types";

export class GeminiProvider implements AIProvider {
  id = "gemini" as const;
  model: string;

  constructor() {
    this.model = getAIConfig().gemini.model;
  }

  isConfigured() {
    return !!getAIConfig().gemini.apiKey;
  }

  private apiKey() {
    return getAIConfig().gemini.apiKey;
  }

  private toGeminiContents(messages: AICompletionRequest["messages"]) {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : m.role === "tool" ? "user" : "user",
        parts: [{ text: m.role === "tool" ? `[Tool result: ${m.toolName}]\n${m.content}` : m.content }],
      }));
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const system = request.messages.find((m) => m.role === "system")?.content ?? "";
    const body = {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: this.toGeminiContents(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
      tools: request.tools?.length
        ? [
            {
              functionDeclarations: request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })),
            },
          ]
        : undefined,
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { content: "", finishReason: "error", provider: "gemini", model: this.model };
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const toolCalls = parts
      .filter((p: { functionCall?: unknown }) => p.functionCall)
      .map((p: { functionCall: { name: string; args: Record<string, unknown> } }, i: number) => ({
        id: `call_${i}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args ?? {},
      }));

    const text = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("");

    return {
      content: text,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: toolCalls.length ? "tool_calls" : "stop",
      provider: "gemini",
      model: this.model,
    };
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const system = request.messages.find((m) => m.role === "system")?.content ?? "";
    const body = {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: this.toGeminiContents(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok || !res.body) {
      yield { type: "error", error: "Gemini stream failed" };
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
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield { type: "text", text };
        } catch {
          /* skip malformed chunks */
        }
      }
    }
    yield { type: "done" };
  }
}
