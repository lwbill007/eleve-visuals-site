import type { AIProviderId } from "./types";

export function getAIConfig() {
  const provider = (process.env.AI_PROVIDER || "gemini") as AIProviderId;
  return {
    provider,
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || "",
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.eleve-visuals.com",
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      model: process.env.OLLAMA_MODEL || "llama3.2",
    },
    maxToolIterations: Number(process.env.AI_MAX_TOOL_ITERATIONS) || 4,
    cacheTtlMs: Number(process.env.AI_CACHE_TTL_MS) || 5 * 60 * 1000,
  };
}

export function getConfiguredProviders(): { id: AIProviderId; configured: boolean; model: string }[] {
  const config = getAIConfig();
  return [
    { id: "gemini", configured: !!config.gemini.apiKey, model: config.gemini.model },
    { id: "openrouter", configured: !!config.openrouter.apiKey, model: config.openrouter.model },
    { id: "ollama", configured: !!config.ollama.baseUrl, model: config.ollama.model },
  ];
}

export function isAIConfigured(): boolean {
  const config = getAIConfig();
  if (config.provider === "gemini") return !!config.gemini.apiKey;
  if (config.provider === "openrouter") return !!config.openrouter.apiKey;
  return !!config.ollama.baseUrl;
}
