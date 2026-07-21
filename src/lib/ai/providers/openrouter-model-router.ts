import { getCached, setCache } from "../cache";
import { getAIConfig, type AIRoutingPolicy } from "../config";
import { getTaskSpec, inferRoutingTask } from "../tasks/registry";
import type { AICompletionRequest, AIRoutingTask } from "../types";
import { supportsTextCompletion } from "./model-capabilities";

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
  estimatedCostScore: number;
}

interface RuntimeHealth {
  successes: number;
  failures: number;
  latencyTotalMs: number;
  jsonSuccesses: number;
  jsonAttempts: number;
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

function estimatedCostScore(model: OpenRouterModelRecord): number {
  // Higher = cheaper. Free models max out; paid models scale by inverse price.
  if (isFree(model)) return 100;
  const prompt = Number(model.pricing?.prompt ?? 1);
  const completion = Number(model.pricing?.completion ?? 1);
  const blended = Math.max(prompt + completion, 1e-9);
  return Math.max(0, Math.min(99, 20 / blended));
}

function hasParameter(model: OpenRouterModelRecord, parameter: string): boolean {
  return model.supported_parameters?.includes(parameter) ?? false;
}

function supportsVision(model: OpenRouterModelRecord): boolean {
  return model.architecture?.input_modalities?.includes("image") ?? false;
}

export function resolveRoutingTask(request: AICompletionRequest): AIRoutingTask {
  return inferRoutingTask({
    task: request.task,
    hasImages: request.messages.some((message) => message.images?.length),
    wantsJson: request.responseFormat === "json",
    hasTools: Boolean(request.tools?.length),
    maxTokens: request.maxTokens,
  });
}

function preferredBoost(id: string, preferred: string[]): number {
  const value = id.toLowerCase();
  let score = 0;
  for (const token of preferred) {
    if (value.includes(token.toLowerCase())) score += 12;
  }
  // Legacy soft priorities for known strong free families.
  if (/deepseek.*(v3|chat)/.test(value)) score += 40;
  if (/qwen.*3/.test(value)) score += 36;
  if (/llama-3\.3-70b/.test(value)) score += 32;
  if (/qwen.*2\.5.*72b/.test(value)) score += 28;
  if (/deepseek.*r1/.test(value)) score += 25;
  if (/mistral.*small.*3\.1/.test(value)) score += 22;
  if (/gemma-(3|4)/.test(value)) score += 18;
  if (/nemotron.*ultra|550b/.test(value)) score += 30;
  else if (/nemotron.*super|120b/.test(value)) score += 24;
  else if (/405b/.test(value)) score += 20;
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
  const jsonRate = health.jsonAttempts ? health.jsonSuccesses / health.jsonAttempts : 0.5;
  return (
    successRate * 20 -
    (1 - successRate) * 35 -
    Math.min(12, averageLatency / 2_500) +
    (jsonRate - 0.5) * 10
  );
}

function policyWeights(policy: AIRoutingPolicy): {
  free: number;
  latency: number;
  structured: number;
  vision: number;
  cost: number;
  reliability: number;
} {
  switch (policy) {
    case "highest_accuracy":
      return { free: 4, latency: 2, structured: 40, vision: 38, cost: 4, reliability: 28 };
    case "lowest_latency":
      return { free: 8, latency: 36, structured: 12, vision: 20, cost: 8, reliability: 18 };
    case "balanced":
      return { free: 18, latency: 12, structured: 24, vision: 28, cost: 12, reliability: 22 };
    case "prefer_free":
    default:
      return { free: 40, latency: 8, structured: 20, vision: 30, cost: 20, reliability: 16 };
  }
}

function scoreModel(
  model: OpenRouterModelRecord,
  request: AICompletionRequest,
  policy: AIRoutingPolicy
): number {
  const task = resolveRoutingTask(request);
  const spec = getTaskSpec(task);
  const weights = policyWeights(policy);
  const contextLength = model.top_provider?.context_length ?? model.context_length ?? 0;
  const free = isFree(model);
  const costScore = estimatedCostScore(model);
  const health = healthAdjustment(model.id);

  let score = preferredBoost(model.id, spec.preferredModels);
  score += Math.min(20, Math.log2(Math.max(contextLength, 1)) - 14);
  if (contextLength >= spec.minContext) score += 10;
  else score -= 18;

  if (hasParameter(model, "structured_outputs")) {
    score += (request.responseFormat === "json" || spec.structuredOutputRequired
      ? weights.structured
      : 6);
  } else if (hasParameter(model, "response_format")) {
    score += request.responseFormat === "json" || spec.structuredOutputRequired
      ? weights.structured * 0.6
      : 3;
  }

  if (hasParameter(model, "tools")) score += request.tools?.length ? 18 : 2;

  if (supportsVision(model)) {
    const needsVision =
      request.messages.some((message) => message.images?.length) || spec.visionRequired;
    score += needsVision ? weights.vision : 1;
  } else if (
    spec.visionRequired ||
    request.messages.some((message) => message.images?.length)
  ) {
    score -= 40;
  }

  if (free) score += weights.free;
  score += (costScore / 100) * weights.cost;
  score += health * (weights.reliability / 20);

  // Latency proxy from runtime health — lower average latency earns policy.latency.
  const runtime = runtimeHealth.get(model.id);
  if (runtime?.successes) {
    const avg = runtime.latencyTotalMs / runtime.successes;
    score += Math.max(0, weights.latency - avg / 1_500);
  }

  return score;
}

function toRouted(
  model: OpenRouterModelRecord,
  request: AICompletionRequest,
  source: RoutedOpenRouterModel["source"],
  policy: AIRoutingPolicy
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
    score: scoreModel(model, request, policy),
    source,
    estimatedCostScore: estimatedCostScore(model),
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
 * Router only: model selection for a request.
 * Evaluation, prompts, and scoring live in evaluation/engine.ts.
 */
export async function routeOpenRouterModels(
  request: AICompletionRequest
): Promise<RoutedOpenRouterModel[]> {
  const catalog = await fetchCatalog();
  const task = resolveRoutingTask(request);
  const spec = getTaskSpec(task);
  const config = getAIConfig();
  const policy = config.routingPolicy || spec.defaultPolicy;
  const hasImages =
    request.messages.some((message) => message.images?.length) || spec.visionRequired;
  const needsTools = Boolean(request.tools?.length);

  const completionCatalog = catalog.filter(supportsTextCompletion);
  const free = completionCatalog
    .filter(isFree)
    .filter((model) => !needsTools || hasParameter(model, "tools"))
    .filter((model) => {
      const ctx = model.top_provider?.context_length ?? model.context_length ?? 0;
      return ctx === 0 || ctx >= Math.min(spec.minContext, 8_192);
    })
    .sort((a, b) => scoreModel(b, request, policy) - scoreModel(a, request, policy));

  // Prefer Free / Balanced still discover free first; Highest Accuracy may keep paid configured chain early.
  const dynamicPool =
    policy === "highest_accuracy"
      ? [...completionCatalog].sort((a, b) => scoreModel(b, request, policy) - scoreModel(a, request, policy))
      : free;

  const compatibleVision = hasImages ? dynamicPool.filter(supportsVision) : dynamicPool;
  const textFallbacks = hasImages ? dynamicPool.filter((model) => !supportsVision(model)) : [];
  const dynamic = [...compatibleVision, ...textFallbacks]
    .slice(0, MAX_DYNAMIC_MODELS)
    .map((model) => toRouted(model, request, "discovery", policy));

  const configuredIds = [
    ...(hasImages ? [config.openrouter.visionModel] : []),
    ...config.openrouter.modelChain,
    "openrouter/free",
  ];
  const discoveredById = new Map(catalog.map((model) => [model.id, model]));
  const configured = configuredIds
    .filter((id) => {
      const discovered = discoveredById.get(id);
      return !discovered || supportsTextCompletion(discovered);
    })
    .map((id) =>
    toRouted(
      discoveredById.get(id) ?? {
        id,
        name: id,
        context_length: 0,
        supported_parameters: [],
        architecture: {
          input_modalities:
            hasImages && id === config.openrouter.visionModel ? ["image"] : ["text"],
        },
      },
      request,
      "configured",
      policy
    )
    );

  const ordered =
    policy === "highest_accuracy"
      ? [...configured, ...dynamic]
      : policy === "lowest_latency"
        ? [...dynamic, ...configured].sort((a, b) => b.score - a.score)
        : [...dynamic, ...configured];

  const unique = new Map<string, RoutedOpenRouterModel>();
  for (const model of ordered) {
    if (!unique.has(model.id)) unique.set(model.id, model);
  }
  return [...unique.values()].sort((a, b) => b.score - a.score);
}

export function recordOpenRouterModelResult(
  modelId: string,
  result: { ok: boolean; latencyMs: number; jsonValid?: boolean }
): void {
  const health = runtimeHealth.get(modelId) ?? {
    successes: 0,
    failures: 0,
    latencyTotalMs: 0,
    jsonSuccesses: 0,
    jsonAttempts: 0,
  };
  if (result.ok) {
    health.successes += 1;
    health.latencyTotalMs += result.latencyMs;
    health.lastSuccessAt = Date.now();
  } else {
    health.failures += 1;
    health.lastFailureAt = Date.now();
  }
  if (result.jsonValid !== undefined) {
    health.jsonAttempts += 1;
    if (result.jsonValid) health.jsonSuccesses += 1;
  }
  runtimeHealth.set(modelId, health);
}

export function getModelReliabilityScore(modelId: string): number {
  const health = runtimeHealth.get(modelId);
  if (!health) return 0.5;
  const total = health.successes + health.failures;
  if (!total) return 0.5;
  return health.successes / total;
}

export async function getOpenRouterRoutingSnapshot(): Promise<{
  policy: AIRoutingPolicy;
  taskRoutes: Record<string, RoutedOpenRouterModel[]>;
  discoveredFreeModels: number;
  runtimeHealth: Record<string, RuntimeHealth & { averageLatencyMs: number; jsonSuccessRate: number }>;
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
    taskRoutes[task] = (
      await routeOpenRouterModels({
        task,
        messages: [
          {
            role: "user",
            content: "health-check routing preview",
            images: previewNeedsVision ? ["https://example.com/preview.jpg"] : undefined,
          },
        ],
        responseFormat:
          task === "json_extraction" || task === "applicant_ranking" ? "json" : undefined,
      })
    ).slice(0, 6);
  }
  const catalog = await fetchCatalog();
  return {
    policy: getAIConfig().routingPolicy,
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
          jsonSuccessRate: health.jsonAttempts
            ? Math.round((health.jsonSuccesses / health.jsonAttempts) * 1000) / 10
            : 0,
        },
      ])
    ),
  };
}
