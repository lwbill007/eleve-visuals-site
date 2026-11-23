import assert from "node:assert/strict";
import test from "node:test";
import { publicApplicationEvaluationFailure } from "./application-evaluation-errors";
import { supportsTextCompletion } from "../providers/model-capabilities";

test("classifies rate limits without exposing provider payloads", () => {
  const failure = publicApplicationEvaluationFailure(
    new Error(
      'HTTP 429: {"error":{"message":"Rate limit exceeded"},"user_id":"private-id"}'
    )
  );
  assert.equal(failure.kind, "capacity");
  assert.match(failure.message, /temporarily unavailable/i);
  assert.doesNotMatch(failure.message, /429|user_id|private-id/);
});

test("classifies an out-of-credit provider account as billing", () => {
  const failure = publicApplicationEvaluationFailure(
    new Error(
      'AI provider returned no usable completion (provider=openrouter, finishReason=error, error=HTTP 402: {"error":{"message":"Insufficient credits. This account never purchased credits.","code":402}})'
    )
  );
  assert.equal(failure.kind, "billing");
  assert.match(failure.message, /no credits/i);
  assert.doesNotMatch(failure.message, /402|never purchased/);
});

test("classifies timeouts and generic provider failures", () => {
  assert.equal(
    publicApplicationEvaluationFailure(new Error("Request timed out")).kind,
    "timeout"
  );
  assert.equal(
    publicApplicationEvaluationFailure(new Error("Malformed JSON")).kind,
    "provider"
  );
});

test("excludes audio-only models from text completion routing", () => {
  assert.equal(
    supportsTextCompletion({
      architecture: { output_modalities: ["audio"] },
    }),
    false
  );
  assert.equal(
    supportsTextCompletion({
      architecture: { output_modalities: ["text", "image"] },
    }),
    true
  );
  assert.equal(supportsTextCompletion({}), true);
});
