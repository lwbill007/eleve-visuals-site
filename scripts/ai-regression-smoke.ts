/**
 * AI regression smoke suite — no live OpenRouter calls.
 * Run: npx tsx scripts/ai-regression-smoke.ts
 */

import assert from "node:assert/strict";
import {
  AI_ARCHITECTURE_MAP,
  AI_DEFINITION_OF_DONE,
  AI_OS_PRINCIPLES,
} from "../src/lib/ai/architecture";
import { decomposeConfidence, validateStructuredJson } from "../src/lib/ai/evaluation/engine";
import { getTaskSpec, inferRoutingTask, listTaskSpecs } from "../src/lib/ai/tasks/registry";

function section(name: string) {
  console.log(`\n✓ ${name}`);
}

section("Architecture principles + DoD present");
assert.equal(AI_OS_PRINCIPLES.length, 4);
assert.ok(AI_DEFINITION_OF_DONE.length >= 8);
assert.deepEqual(
  [...AI_ARCHITECTURE_MAP],
  [
    "Providers",
    "Router",
    "Task Registry",
    "Prompt Templates",
    "Evaluation Services",
    "Structured Output Layer",
    "Retry Layer",
    "Persistence",
    "Business Brain",
  ]
);

section("Task registry covers all routing tasks");
const specs = listTaskSpecs();
assert.ok(specs.length >= 12);
for (const spec of specs) {
  assert.ok(spec.preferredModels.length > 0, `${spec.id} needs preferred models`);
  assert.ok(spec.minContext >= 4_096, `${spec.id} minContext too low`);
  assert.ok(spec.maxRetries >= 1);
  assert.ok(spec.cacheTtlMs > 0);
}

section("Task inference");
assert.equal(inferRoutingTask({ hasImages: true }), "vision_analysis");
assert.equal(inferRoutingTask({ wantsJson: true }), "json_extraction");
assert.equal(inferRoutingTask({ hasTools: true }), "business_analysis");
assert.equal(inferRoutingTask({ maxTokens: 5_000 }), "long_form_reasoning");
assert.equal(inferRoutingTask({ task: "executive_summary" }), "executive_summary");

section("Applicant evaluation requires vision + structured output");
const applicant = getTaskSpec("applicant_ranking");
assert.equal(applicant.visionRequired, true);
assert.equal(applicant.structuredOutputRequired, true);

section("Confidence decomposition is explainable");
const confidence = decomposeConfidence({
  evidence: 0.8,
  modelReliability: 0.7,
  structuredOutputSuccess: 1,
  historicalAccuracy: 0.6,
});
assert.ok(confidence.overall > 0.6 && confidence.overall < 0.95);
assert.equal(confidence.breakdown.length, 4);
assert.ok(confidence.breakdown.every((row) => row.weightPct > 0));

section("Structured JSON validation");
assert.equal(validateStructuredJson('{"ok":true}').ok, true);
assert.equal(validateStructuredJson("not-json").ok, false);
assert.equal(
  validateStructuredJson('{"ok":true}', () => false).ok,
  false
);

console.log("\nAI regression smoke passed.\n");
