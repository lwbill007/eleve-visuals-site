import assert from "node:assert/strict";
import {
  VOL_TIERS,
  cleanExperiencePreference,
  offeredVolTiers,
  rolesCanChooseTier,
  volComparisonRows,
} from "../src/lib/vol-tiers";
import { APPROVED_PRICING_PACKAGES } from "../src/lib/pricing-config";
import { parseApplicationSettings } from "../src/lib/session-application";

let passed = 0;
const test = (_name: string, fn: () => void) => {
  fn();
  passed++;
};

// Approved 2026-11-23 (vault: _build/vol-tiers-2026-11-23). Change only with owner approval.
const APPROVED = {
  free: { price: 0, photos: 2, clean: 0, sig: 0, looks: 1, solo: 0, layouts: 0, prints: 0, days: 10 },
  entry: { price: 25, photos: 4, clean: 1, sig: 0, looks: 1, solo: 0, layouts: 0, prints: 0, days: 7 },
  select: { price: 45, photos: 6, clean: 2, sig: 0, looks: 2, solo: 0, layouts: 0, prints: 0, days: 7 },
  featured: { price: 95, photos: 10, clean: 3, sig: 1, looks: 2, solo: 5, layouts: 1, prints: 0, days: 5 },
  signature: { price: 175, photos: 12, clean: 4, sig: 2, looks: 3, solo: 10, layouts: 2, prints: 1, days: 5 },
} as const;

test("tier table matches the approved proposal", () => {
  assert.deepEqual(VOL_TIERS.map((t) => t.id), Object.keys(APPROVED));
  for (const tier of VOL_TIERS) {
    const a = APPROVED[tier.id];
    assert.deepEqual(
      [tier.price, tier.finalPhotos, tier.cleanRetouches, tier.signatureRetouches, tier.maxLooks, tier.soloMinutes, tier.layouts, tier.prints, tier.deliveryBusinessDays],
      [a.price, a.photos, a.clean, a.sig, a.looks, a.solo, a.layouts, a.prints, a.days],
      tier.id
    );
  }
});

test("post-production budgets fit the price at $50/h (editing only)", () => {
  for (const tier of VOL_TIERS.filter((t) => t.price > 0)) {
    assert.ok((tier.postBudgetMinutes / 60) * 50 <= tier.price * 1.1, `${tier.id} budget too generous`);
  }
});

test("VOL. tiers are separate from BOOK ÉLEVÉ commercial packages", () => {
  const commercialIds = new Set(APPROVED_PRICING_PACKAGES.map((p) => p.id));
  for (const tier of VOL_TIERS) assert.ok(!commercialIds.has(tier.id));
  assert.deepEqual(
    APPROVED_PRICING_PACKAGES.map((p) => p.price).sort((a, b) => a - b),
    [225, 450, 450, 650, 975, 1350, 1350, 3500, 4250]
  );
});

test("free is always offered; empty list = all", () => {
  assert.equal(offeredVolTiers([]).length, 5);
  assert.deepEqual(offeredVolTiers(["signature"]).map((t) => t.id), ["free", "signature"]);
  assert.deepEqual(offeredVolTiers(["bogus"]).map((t) => t.id), VOL_TIERS.map((t) => t.id));
});

test("only models choose a tier", () => {
  assert.equal(rolesCanChooseTier(["Model"]), true);
  assert.equal(rolesCanChooseTier(["Photographer", "Stylist"]), false);
});

test("preference kept only when enabled, offered and role qualifies", () => {
  const on = { tiersEnabled: true, tiersOffered: ["entry", "featured"] };
  assert.equal(cleanExperiencePreference("featured", ["Model"], on), "featured");
  assert.equal(cleanExperiencePreference("signature", ["Model"], on), "");
  assert.equal(cleanExperiencePreference("featured", ["Photographer"], on), "");
  assert.equal(cleanExperiencePreference("featured", ["Model"], { tiersEnabled: false, tiersOffered: [] }), "");
  assert.equal(cleanExperiencePreference("free", ["Model"], on), "free");
  assert.equal(cleanExperiencePreference(42, ["Model"], on), "");
});

test("tiers are off by default for every volume", () => {
  const s = parseApplicationSettings(JSON.stringify({ requirePortfolio: false }));
  assert.equal(s.tiersEnabled, false);
  assert.deepEqual(s.tiersOffered, []);
  assert.equal(parseApplicationSettings(JSON.stringify({ tiersEnabled: "yes" })).tiersEnabled, false);
});

test("comparison table has a value per tier", () => {
  for (const row of volComparisonRows(VOL_TIERS)) assert.equal(row.values.length, 5);
});

console.log(`vol-tiers: ${passed} passed`);
