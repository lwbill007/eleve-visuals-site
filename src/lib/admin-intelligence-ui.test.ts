import assert from "node:assert/strict";
import test from "node:test";
import {
  describeEvidenceWeight,
  describeSimulationBasis,
  keepStaleOnFailure,
  selectBatchVerificationPreview,
} from "./admin-intelligence-ui";

test("limits batch verification preview without changing queue order", () => {
  const queue = Array.from({ length: 25 }, (_, index) => ({
    id: String(index),
    title: `Memory ${index}`,
  }));

  assert.deepEqual(selectBatchVerificationPreview(queue).map((item) => item.id), queue.slice(0, 20).map((item) => item.id));
});

test("retains the last successful panel data after a failed refresh", () => {
  const stale = { generatedAt: "earlier", value: 4 };
  assert.equal(keepStaleOnFailure(stale, null), stale);
  assert.deepEqual(keepStaleOnFailure(stale, { generatedAt: "now", value: 5 }), {
    generatedAt: "now",
    value: 5,
  });
});

test("labels heuristic simulation and evidence scores without claiming accuracy", () => {
  assert.match(describeSimulationBasis(0.55), /Heuristic/);
  assert.match(describeSimulationBasis(0), /Unavailable/);
  assert.match(describeEvidenceWeight("metric"), /Source weighting/);
  assert.match(describeEvidenceWeight("memory"), /not independently measured accuracy/);
});
