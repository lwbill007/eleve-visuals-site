import type { TransparentRecommendation, InsightKind } from "./types";
import type { BusinessAction } from "../types";

export function buildTransparentRecommendation(input: {
  id: string;
  title: string;
  detail: string;
  why: string;
  kind: InsightKind;
  confidence: number;
  historicalEvidence: string[];
  supportingMemories?: string[];
  supportingMetrics?: string[];
  alternatives?: { label: string; tradeoff: string }[];
  expectedImpact: string;
  priority: number;
  actions?: BusinessAction[];
}): TransparentRecommendation {
  return {
    ...input,
    supportingMemories: input.supportingMemories ?? [],
    supportingMetrics: input.supportingMetrics ?? [],
    alternatives: input.alternatives ?? [],
    actions: input.actions ?? [],
  };
}

export function classifyStatements(input: {
  facts: string[];
  predictions: string[];
  assumptions: string[];
  ideas: string[];
}) {
  return input;
}
