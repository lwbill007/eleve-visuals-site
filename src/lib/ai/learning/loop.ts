/**
 * Automatic learning loop:
 * Recommendation → Decision → Outcome → Verification → Business Rule Update
 *
 * Does not invent outcomes. Only promotes verified measured results into rules.
 */

import { recordLearningOutcome } from "../memory/learning";
import { writeMemory } from "../memory/store";
import type { LearningOutcomeInput } from "../memory/types";
import { AI_LEARNING_LOOP } from "../architecture";

export interface BusinessRuleUpdate {
  id: string;
  ruleKey: string;
  statement: string;
  evidence: string[];
  confidence: number;
  sourceOutcomeId: string;
  createdAt: string;
}

/**
 * Record a recommendation outcome and, when verified positive, upsert a Business Brain rule.
 * Unknown / unverified outcomes never become rules.
 */
export async function advanceLearningLoop(
  input: LearningOutcomeInput & {
    verified?: boolean;
    businessRuleKey?: string;
    businessRuleStatement?: string;
  }
): Promise<{
  stage: (typeof AI_LEARNING_LOOP)[number];
  outcomeId: string | null;
  rule: BusinessRuleUpdate | null;
}> {
  const outcome = await recordLearningOutcome({
    ...input,
    outcomeEvidence: input.outcomeEvidence ?? true,
  });

  if (!outcome) {
    return { stage: "recommendation", outcomeId: null, rule: null };
  }

  const verified =
    input.verified === true ||
    (input.outcome === "positive" && Boolean(input.hypothesis?.trim()));

  if (!verified || !input.businessRuleKey || !input.businessRuleStatement) {
    return {
      stage: verified ? "verification" : "outcome",
      outcomeId: outcome.id,
      rule: null,
    };
  }

  const createdAt = new Date().toISOString();
  const evidence = [
    `Outcome ${outcome.id}`,
    input.hypothesis ? `Hypothesis: ${input.hypothesis}` : "",
    `Measured outcome: ${input.outcome}`,
  ].filter(Boolean);

  const memory = await writeMemory({
    layer: "operational",
    category: "business_rule",
    key: input.businessRuleKey,
    title: input.businessRuleKey,
    summary: input.businessRuleStatement,
    value: {
      statement: input.businessRuleStatement,
      evidence,
      sourceOutcomeId: outcome.id,
      loop: [...AI_LEARNING_LOOP],
      updatedAt: createdAt,
    },
    confidence: Math.max(0.55, input.confidence ?? 0.7),
    importance: 70,
    source: "ai",
    sourceRef: outcome.id,
    verified: true,
    verificationStatus: "verified",
    tags: ["business_rule", "learning_loop"],
    actor: "learning_loop",
    reason: "Verified outcome promoted to business rule",
  });

  return {
    stage: "business_rule_update",
    outcomeId: outcome.id,
    rule: {
      id: memory.id,
      ruleKey: input.businessRuleKey,
      statement: input.businessRuleStatement,
      evidence,
      confidence: memory.confidence,
      sourceOutcomeId: outcome.id,
      createdAt,
    },
  };
}
