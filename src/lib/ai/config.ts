import type { AIProviderId } from "./types";

export type AIRoutingPolicy =
  | "prefer_free"
  | "balanced"
  | "highest_accuracy"
  | "lowest_latency";

const DEFAULT_MODEL_CHAIN = [
  "qwen/qwen3-32b",
  "deepseek/deepseek-chat-v3-0324",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.1-24b-instruct",
] as const;

function parseRoutingPolicy(raw: string | undefined): AIRoutingPolicy {
  const value = (raw || "prefer_free").trim().toLowerCase();
  if (
    value === "prefer_free" ||
    value === "balanced" ||
    value === "highest_accuracy" ||
    value === "lowest_latency"
  ) {
    return value;
  }
  return "prefer_free";
}

export function getAIConfig() {
  const provider = (process.env.AI_PROVIDER || "openrouter") as AIProviderId;
  const primaryModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL_CHAIN[0];

  const envFallbacks = process.env.OPENROUTER_FALLBACK_MODELS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const modelChain = [...new Set([primaryModel, ...(envFallbacks ?? DEFAULT_MODEL_CHAIN.slice(1))])];

  return {
    provider,
    routingPolicy: parseRoutingPolicy(process.env.AI_ROUTING_POLICY),
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || "",
      model: primaryModel,
      modelChain,
      visionModel: process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.eleve-visuals.com",
      maxRetries: Number(process.env.AI_MAX_RETRIES) || 2,
      maxAttempts: Number(process.env.AI_MAX_MODEL_ATTEMPTS) || 8,
      retryDelayMs: Number(process.env.AI_RETRY_DELAY_MS) || 600,
      minIntervalMs: Number(process.env.AI_MIN_INTERVAL_MS) || 120,
      timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 45_000,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      model: process.env.OLLAMA_MODEL || "llama3.2",
    },
    maxToolIterations: Number(process.env.AI_MAX_TOOL_ITERATIONS) || 4,
    cacheTtlMs: Number(process.env.AI_CACHE_TTL_MS) || 5 * 60 * 1000,
  };
}

export function getOpenRouterModelChain(): string[] {
  return getAIConfig().openrouter.modelChain;
}

export function isAIConfigured(): boolean {
  const config = getAIConfig();
  if (config.openrouter.apiKey) return true;
  if (config.provider === "ollama" || process.env.OLLAMA_BASE_URL) return true;
  return false;
}

export function getConfiguredProviders(): { id: AIProviderId; configured: boolean; model: string }[] {
  const config = getAIConfig();
  return [
    {
      id: "openrouter",
      configured: !!config.openrouter.apiKey,
      model: config.openrouter.model,
    },
    {
      id: "ollama",
      configured: config.provider === "ollama" || Boolean(process.env.OLLAMA_BASE_URL),
      model: config.ollama.model,
    },
  ];
}
