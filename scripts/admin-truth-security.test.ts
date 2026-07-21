import assert from "node:assert/strict";
import {
  isOpenPipelineValueStatus,
  isProductionOrClosedValueStatus,
} from "../src/lib/booking-pipeline";
import { paymentCountsAsVerifiedRevenue } from "../src/lib/payments";
import { buildExecutiveConfidence } from "../src/lib/ai/truth/confidence-engine";
import type { PrioritizedRecommendation } from "../src/lib/ai/types";

assert.equal(paymentCountsAsVerifiedRevenue({
  status: "succeeded",
  verificationStatus: "pending",
}), false);
assert.equal(paymentCountsAsVerifiedRevenue({
  status: "succeeded",
  verificationStatus: "verified",
}), true);

for (const status of ["new", "contacted", "lead", "qualified", "discovery", "proposal"]) {
  assert.equal(isOpenPipelineValueStatus(status), true, `${status} should be open pipeline`);
}
for (const status of ["scheduled", "booked", "production", "completed", "delivered"]) {
  assert.equal(
    isProductionOrClosedValueStatus(status),
    true,
    `${status} should be production/closed value`
  );
  assert.equal(isOpenPipelineValueStatus(status), false, `${status} must not be open pipeline`);
}

const recommendation: PrioritizedRecommendation = {
  id: "test",
  title: "Test",
  detail: "Test detail",
  category: "sales",
  estimatedRevenue: 100,
  confidence: 0.99,
  timeToCompleteMinutes: 10,
  difficulty: "easy",
  priority: "high",
  whyNow: "Now",
  evidence: ["CRM row exists"],
  actions: [],
};
assert.equal(buildExecutiveConfidence(recommendation).truthStatus, "estimated");
assert.equal(
  buildExecutiveConfidence({
    ...recommendation,
    evidence: ["Verified: CRM row checked against source"],
  }).truthStatus,
  "verified"
);

console.log("admin-truth-security tests passed");
