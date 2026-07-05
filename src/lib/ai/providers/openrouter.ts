import { getAIConfig } from "../config";
import { openRouterComplete, openRouterStream, isOpenRouterConfigured } from "./openrouter-client";
import type { AICompletionRequest, AICompletionResult, AIProvider, AIStreamChunk } from "../types";

/** OpenRouter provider adapter — delegates to shared client with model fallback. */
export class OpenRouterProvider implements AIProvider {
  id = "openrouter" as const;
  model: string;

  constructor() {
    this.model = getAIConfig().openrouter.model;
  }

  isConfigured() {
    return isOpenRouterConfigured();
  }

  complete(request: AICompletionRequest): Promise<AICompletionResult> {
    return openRouterComplete(request);
  }

  stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    return openRouterStream(request);
  }
}
