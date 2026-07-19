import { getCached, setCache } from "../cache";
import { getAIConfig } from "../config";
import type { AICompletionRequest, AIRoutingTask } from "../types";

const MODEL_CACHE_KEY = "openrouter:model-catalog:v1";
const MODEL_CACHE_TTL_MS = 15 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 8_000;
const MAX_DYNAMIC_MODELS = 8;

interface OpenRouterModelRecord {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
  };
}

export interface RoutedOpenRouterModel {
  id: string;
  name: string;
  contextLength: number;
  free: boolean;
  vision: boolean;
  jsonMode: boolean;
  structuredOutputs: boolean;
  tools: boolean;
  score: number;
  source: "discovery" | "configured";
}

interface RuntimeHealth {
  successes: number;
  failures: number;
  latencyTotalMs: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
}

const runtimeHealth = new Map<string, RuntimeHealth>();
let memoryCatalog: { expiresAt: number; models: OpenRouterModelRecord[] } | null = null;
let discoveryPromise: Promise<OpenRouterModelRecord[]> | null = null;

function isZeroPrice(value: string | undefined): boolean {
  return value != null && Number(value) === 0;
}

function isFree(model: OpenRouterModelRecord): boolean {
  return isZeroPrice(model.pricing?.prompt) && isZeroPrice(model.pricing?.completion);
}

function hasParameter(model: OpenRouterModelRecord, parameter: string): boolean {
  return model.supported_parameters?.includes(parameter) ?? false;
}

function supportsVision(model: OpenRouterModelRecord): boolean {
  return model.architecture?.input_modalities?.includes("image") ?? false;
}

function taskFor(request: AICompletionRequest): AIRoutingTask {
  if (request.task) return request.task;
  if (request.messages.some((message) => message.images?.length)) return "vision_analysis";
  if (request.responseFormat === "json") return "json_extraction";
  if (request.tools?.length) return "business_analysis";
  if ((request.maxTokens ?? 0) >= 4_000) return "long_form_reasoning";
  return "general";
}

function namePriority(id: string, task: AIRoutingTask): number {
  const value = id.toLowerCase();
  let score = 0;

  // User-requested free reasoning priorities, evaluated only after live
  // discovery proves that the model is currently free and available.
  if (/deepseek.*(v3|chat)/.test(value)) score += 100;
  if (/qwen.*3/.test(value)) score += 96;
  if (/llama-3\.3-70b/.test(value)) score += 92;
  if (/qwen.*2\.5.*72b/.test(value)) score += 88;
  if (/deepseek.*r1/.test(value)) score += 85;
  if (/mistral.*small.*3\.1/.test(value)) score += 82;
  if (/gemma-(3|4)/.test(value)) score += 78;

  // Strong dynamically discovered alternatives. Size/context affect ordering,
  // but do not override required capabilities.
  if (/nemotron.*ultra|550b/.test(value)) score += 90;
  else if (/nemotron.*super|120b/.test(value)) score += 84;
  else if (/405b/.test(value)) score += 80;

  if (task === "json_extraction" || task === "applicant_ranking") {
    if (/qwen|gemma|gpt-oss|nemotron/.test(value)) score += 8;
  }
  if (task === "vision_analysis" || task === "portfolio_review" || task === "applicant_ranking") {
    if (/gemma|gemini|nemotron.*(vl|omni)/.test(value)) score += 15;
  }
  if (task === "long_form_reasoning" || task === "financial_analysis") {
    if (/deepseek|qwen|nemotron|llama/.test(value)) score += 8;
  }
  if (task === "content_generation" || task === "creative_feedback") {
    if (/gemma|llama|mistral/.test(value)) score += 6;
  }
  return score;
}

function healthAdjustment(modelId: string): number {
  const health = runtimeHealth.get(modelId);
  if (!health) return 0;
  const total = health.successes + health.failures;
  const successRate = total ? health.successes / total : 0.5;
  const averageLatency = health.successes
    ? health.latencyTotalMs / health.successes
    : 30_000;
  return successRate * 20 - (1 - successRate) * 35 - Math.min(12, averageLatency / 2_500);
}

function scoreModel(model: OpenRouterModelRecord, request: AICompletionRequest): number {
  const task = taskFor(request);
  const contextLength = model.top_provider?.context_length ?? model.context_length ?? 0;
  let score = namePriority(model.id, task);
  score += Math.min(20, Math.log2(Math.max(contextLength, 1)) - 14);
  if (hasParameter(model, "structured_outputs")) score += request.responseFormat === "json" ? 32 : 6;
  else if (hasParameter(model, "response_format")) score += request.responseFormat === "json" ? 18 : 3;
  if (hasParameter(model, "tools")) score += request.tools?.length ? 18 : 2;
  if (supportsVision(model)) {
    score += request.messages.some((message) => message.images?.length) ? 35 : 1;
  }
  score += healthAdjustment(model.id);
  return score;
}

function toRouted(
  model: OpenRouterModelRecord,
  request: AICompletionRequest,
  source: RoutedOpenRouterModel["source"]
): RoutedOpenRouterModel {
  return {
    id: model.id,
    name: model.name || model.id,
    contextLength: model.top_provider?.context_length ?? model.context_length ?? 0,
    free: isFree(model),
    vision: supportsVision(model),
    jsonMode: hasParameter(model, "response_format"),
    structuredOutputs: hasParameter(model, "structured_outputs"),
    tools: hasParameter(model, "tools"),
    score: scoreModel(model, request),
    source,
  };
}

async function fetchCatalog(): Promise<OpenRouterModelRecord[]> {
  if (memoryCatalog && memoryCatalog.expiresAt > Date.now()) return memoryCatalog.models;
  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = (async () => {
    try {
      const cached = await getCached<OpenRouterModelRecord[]>(MODEL_CACHE_KEY).catch(() => null);
      if (cached?.length) {
        memoryCatalog = { models: cached, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
        return cached;
      }

      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`OpenRouter model discovery returned HTTP ${response.status}`);
      const body = (await response.json()) as { data?: OpenRouterModelRecord[] };
      const models = Array.isArray(body.data) ? body.data : [];
      if (!models.length) throw new Error("OpenRouter model discovery returned no models");
      memoryCatalog = { models, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
      await setCache(MODEL_CACHE_KEY, models, MODEL_CACHE_TTL_MS).catch(() => {});
      return models;
    } catch (error) {
      console.error("[ai-router] OpenRouter model discovery failed:", error);
      return memoryCatalog?.models ?? [];
    } finally {
      discoveryPromise = null;
    }
  })();

  return discoveryPromise;
}

/**
 * Returns the strongest live free models compatible with the request, followed
 * by the existing configured chain for backward compatibility and outage
 * fallback. No configured provider or model is removed.
 */
export async function routeOpenRouterModels(
  request: AICompletionRequest
): Promise<RoutedOpenRouterModel[]> {
  const catalog = await fetchCatalog();
  const hasImages = request.messages.some((message) => message.images?.length);
  const needsTools = Boolean(request.tools?.length);

  const free = catalog
    .filter(isFree)
    .filter((model) => !needsTools || hasParameter(model, "tools"))
    .sort((a, b) => scoreModel(b, request) - scoreModel(a, request));

  const compatibleVision = hasImages ? free.filter(supportsVision) : free;
  const textFallbacks = hasImages ? free.filter((model) => !supportsVision(model)) : [];
  const dynamic = [...compatibleVision, ...textFallbacks]
    .slice(0, MAX_DYNAMIC_MODELS)
    .map((model) => toRouted(model, request, "discovery"));

  const config = getAIConfig().openrouter;
  const configuredIds = [
    ...(hasImages ? [config.visionModel] : []),
    ...config.modelChain,
    "openrouter/free",
  ];
  const byId = new Map(catalog.map((model) => [model.id, model]));
  const configured = configuredIds.map((id) =>
    toRouted(
      byId.get(id) ?? {
        id,
        name: id,
        context_length: 0,
        supported_parameters: [],
        architecture: { input_modalities: hasImages && id === config.visionModel ? ["image"] : ["text"] },
      },
      request,
      "configured"
    )
  );

  const unique = new Map<string, RoutedOpenRouterModel>();
  for (const model of [...dynamic, ...configured]) {
    if (!unique.has(model.id)) unique.set(model.id, model);
  }
  return [...unique.values()];
}

export function recordOpenRouterModelResult(
  modelId: string,
  result: { ok: boolean; latencyMs: number }
): void {
  const health = runtimeHealth.get(modelId) ?? {
    successes: 0,
    failures: 0,
    latencyTotalMs: 0,
  };
  if (result.ok) {
    health.successes += 1;
    health.latencyTotalMs += result.latencyMs;
    health.lastSuccessAt = Date.now();
  } else {
    health.failures += 1;
    health.lastFailureAt = Date.now();
  }
  runtimeHealth.set(modelId, health);
}

export async function getOpenRouterRoutingSnapshot(): Promise<{
  taskRoutes: Record<string, RoutedOpenRouterModel[]>;
  discoveredFreeModels: number;
  runtimeHealth: Record<string, RuntimeHealth & { averageLatencyMs: number }>;
}> {
  const tasks: AIRoutingTask[] = [
    "applicant_ranking",
    "vision_analysis",
    "executive_summary",
    "financial_analysis",
    "marketing_strategy",
    "json_extraction",
    "long_form_reasoning",
    "chat",
  ];
  const taskRoutes: Record<string, RoutedOpenRouterModel[]> = {};
  for (const task of tasks) {
    const previewNeedsVision = task === "vision_analysis" || task === "applicant_ranking";
    taskRoutes[task] = (await routeOpenRouterModels({
      task,
      messages: [
        {
          role: "user",
          content: "health-check routing preview",
          images: previewNeedsVision ? ["https://example.com/preview.jpg"] : undefined,
        },
      ],
      responseFormat: task === "json_extraction" || task === "applicant_ranking" ? "json" : undefined,
    })).slice(0, 6);
  }
  const catalog = await fetchCatalog();
  return {
    taskRoutes,
    discoveredFreeModels: catalog.filter(isFree).length,
    runtimeHealth: Object.fromEntries(
      [...runtimeHealth.entries()].map(([id, health]) => [
        id,
        {
          ...health,
          averageLatencyMs: health.successes
            ? Math.round(health.latencyTotalMs / health.successes)
            : 0,
        },
      ])
    ),
  };
}
