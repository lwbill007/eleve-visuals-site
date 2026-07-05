import { getAIConfig } from "../config";
import type { AIProvider, AIProviderId } from "../types";
import { GeminiProvider } from "./gemini";
import { OpenRouterProvider } from "./openrouter";
import { OllamaProvider } from "./ollama";

const instances: Partial<Record<AIProviderId, AIProvider>> = {};

function createProvider(id: AIProviderId): AIProvider {
  switch (id) {
    case "gemini":
      return new GeminiProvider();
    case "openrouter":
      return new OpenRouterProvider();
    case "ollama":
      return new OllamaProvider();
  }
}

/** Returns configured provider, falling back through priority list */
export function getAIProvider(preferred?: AIProviderId): AIProvider {
  const config = getAIConfig();
  const order: AIProviderId[] = preferred
    ? [preferred, config.provider, "gemini", "openrouter", "ollama"]
    : [config.provider, "gemini", "openrouter", "ollama"];

  const seen = new Set<AIProviderId>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!instances[id]) instances[id] = createProvider(id);
    const provider = instances[id]!;
    if (provider.isConfigured()) return provider;
  }

  if (!instances.gemini) instances.gemini = new GeminiProvider();
  return instances.gemini;
}

export function getProviderStatus() {
  const config = getAIConfig();
  return {
    active: getAIProvider().id,
    configured: getAIProvider().isConfigured(),
    providers: (["gemini", "openrouter", "ollama"] as AIProviderId[]).map((id) => {
      const p = createProvider(id);
      return { id, configured: p.isConfigured(), model: p.model };
    }),
    envProvider: config.provider,
  };
}
