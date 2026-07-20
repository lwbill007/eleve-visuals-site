/**
 * Task Registry — single source of truth for routing requirements.
 * Router reads this. Evaluation does not select models.
 */

import type { AIRoutingTask } from "../types";
import type { AIRoutingPolicy } from "../config";

export interface AITaskSpec {
  id: AIRoutingTask;
  label: string;
  /** Preferred model id substrings / exact ids (scored as soft boosts). */
  preferredModels: string[];
  /** Minimum context window in tokens. */
  minContext: number;
  structuredOutputRequired: boolean;
  visionRequired: boolean;
  maxRetries: number;
  cacheTtlMs: number;
  defaultPolicy: AIRoutingPolicy;
  /** Layer this task primarily serves (see architecture.ts). */
  layer: "reasoning" | "execution" | "knowledge" | "learning" | "data";
}

const DEFAULTS = {
  minContext: 8_192,
  maxRetries: 2,
  cacheTtlMs: 5 * 60 * 1000,
  defaultPolicy: "prefer_free" as AIRoutingPolicy,
};

export const AI_TASK_REGISTRY: Record<AIRoutingTask, AITaskSpec> = {
  applicant_ranking: {
    id: "applicant_ranking",
    label: "Applicant Evaluation",
    preferredModels: ["qwen", "gemma", "gpt-oss", "nemotron", "gemini"],
    minContext: 16_384,
    structuredOutputRequired: true,
    visionRequired: true,
    maxRetries: 3,
    cacheTtlMs: 30 * 60 * 1000,
    defaultPolicy: "balanced",
    layer: "reasoning",
  },
  business_analysis: {
    id: "business_analysis",
    label: "Business Analysis",
    preferredModels: ["deepseek", "qwen", "llama"],
    minContext: 16_384,
    structuredOutputRequired: true,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 10 * 60 * 1000,
    defaultPolicy: "prefer_free",
    layer: "reasoning",
  },
  portfolio_review: {
    id: "portfolio_review",
    label: "Portfolio Vision",
    preferredModels: ["gemma", "gemini", "nemotron"],
    minContext: 16_384,
    structuredOutputRequired: true,
    visionRequired: true,
    maxRetries: 2,
    cacheTtlMs: 30 * 60 * 1000,
    defaultPolicy: "highest_accuracy",
    layer: "reasoning",
  },
  vision_analysis: {
    id: "vision_analysis",
    label: "Vision Analysis",
    preferredModels: ["gemma", "gemini", "nemotron"],
    minContext: 8_192,
    structuredOutputRequired: false,
    visionRequired: true,
    maxRetries: 2,
    cacheTtlMs: 15 * 60 * 1000,
    defaultPolicy: "highest_accuracy",
    layer: "reasoning",
  },
  executive_summary: {
    id: "executive_summary",
    label: "Executive Summary",
    preferredModels: ["deepseek", "qwen", "llama"],
    minContext: 8_192,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: 1,
    cacheTtlMs: 5 * 60 * 1000,
    defaultPolicy: "lowest_latency",
    layer: "execution",
  },
  hiring_intelligence: {
    id: "hiring_intelligence",
    label: "Hiring",
    preferredModels: ["qwen", "deepseek", "llama"],
    minContext: 16_384,
    structuredOutputRequired: true,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 15 * 60 * 1000,
    defaultPolicy: "balanced",
    layer: "reasoning",
  },
  creative_feedback: {
    id: "creative_feedback",
    label: "Creative Feedback",
    preferredModels: ["gemma", "llama", "mistral"],
    minContext: 8_192,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 10 * 60 * 1000,
    defaultPolicy: "prefer_free",
    layer: "reasoning",
  },
  financial_analysis: {
    id: "financial_analysis",
    label: "Financial",
    preferredModels: ["deepseek", "qwen", "nemotron", "llama"],
    minContext: 16_384,
    structuredOutputRequired: true,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 10 * 60 * 1000,
    defaultPolicy: "highest_accuracy",
    layer: "reasoning",
  },
  marketing_strategy: {
    id: "marketing_strategy",
    label: "Marketing",
    preferredModels: ["qwen", "llama", "mistral", "gemma"],
    minContext: 8_192,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 10 * 60 * 1000,
    defaultPolicy: "prefer_free",
    layer: "reasoning",
  },
  json_extraction: {
    id: "json_extraction",
    label: "Knowledge Extraction",
    preferredModels: ["qwen", "gemma", "gpt-oss", "nemotron"],
    minContext: 8_192,
    structuredOutputRequired: true,
    visionRequired: false,
    maxRetries: 3,
    cacheTtlMs: 30 * 60 * 1000,
    defaultPolicy: "highest_accuracy",
    layer: "knowledge",
  },
  long_form_reasoning: {
    id: "long_form_reasoning",
    label: "Reasoning",
    preferredModels: ["deepseek", "qwen", "nemotron", "llama"],
    minContext: 32_768,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 5 * 60 * 1000,
    defaultPolicy: "balanced",
    layer: "reasoning",
  },
  chat: {
    id: "chat",
    label: "Chat",
    preferredModels: ["qwen", "llama", "mistral", "deepseek"],
    minContext: DEFAULTS.minContext,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: DEFAULTS.maxRetries,
    cacheTtlMs: DEFAULTS.cacheTtlMs,
    defaultPolicy: "lowest_latency",
    layer: "execution",
  },
  content_generation: {
    id: "content_generation",
    label: "Content Generation",
    preferredModels: ["gemma", "llama", "mistral"],
    minContext: 8_192,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: 2,
    cacheTtlMs: 15 * 60 * 1000,
    defaultPolicy: "prefer_free",
    layer: "execution",
  },
  general: {
    id: "general",
    label: "General",
    preferredModels: ["qwen", "deepseek", "llama", "mistral"],
    minContext: DEFAULTS.minContext,
    structuredOutputRequired: false,
    visionRequired: false,
    maxRetries: DEFAULTS.maxRetries,
    cacheTtlMs: DEFAULTS.cacheTtlMs,
    defaultPolicy: DEFAULTS.defaultPolicy,
    layer: "execution",
  },
};

export function getTaskSpec(task: AIRoutingTask): AITaskSpec {
  return AI_TASK_REGISTRY[task] ?? AI_TASK_REGISTRY.general;
}

export function listTaskSpecs(): AITaskSpec[] {
  return Object.values(AI_TASK_REGISTRY);
}

/** Infer routing task from request shape when task is omitted. */
export function inferRoutingTask(input: {
  task?: AIRoutingTask;
  hasImages?: boolean;
  wantsJson?: boolean;
  hasTools?: boolean;
  maxTokens?: number;
}): AIRoutingTask {
  if (input.task) return input.task;
  if (input.hasImages) return "vision_analysis";
  if (input.wantsJson) return "json_extraction";
  if (input.hasTools) return "business_analysis";
  if ((input.maxTokens ?? 0) >= 4_000) return "long_form_reasoning";
  return "general";
}
