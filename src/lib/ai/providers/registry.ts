import { getAIConfig } from "../config";
import type { AIProvider, AIProviderId } from "../types";
import { OpenRouterProvider } from "./openrouter";
import { OllamaProvider } from "./ollama";

const instances: Partial<Record<AIProviderId, AIProvider>> = {};

function createProvider(id: AIProviderId): AIProvider {
  if (id === "openrouter") return new OpenRouterProvider();
  return new OllamaProvider();
}

/** Returns the best configured provider adapter (OpenRouter preferred). */
export function getAIProvider(preferred?: AIProviderId): AIProvider {
  const config = getAIConfig();
  const order: AIProviderId[] = preferred
    ? [preferred, config.provider, "openrouter", "ollama"]
    : [config.provider, "openrouter", "ollama"];

  const seen = new Set<AIProviderId>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!instances[id]) instances[id] = createProvider(id);
    const provider = instances[id]!;
    if (provider.isConfigured()) return provider;
  }

  if (!instances.openrouter) instances.openrouter = new OpenRouterProvider();
  return instances.openrouter;
}
