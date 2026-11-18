import assert from "node:assert/strict";
import {
  APPROVED_PRICING_PACKAGES,
  MEDIA_DELIVERY_DEFINITIONS,
  PRICING_STATUS,
  SERVICE_STARTING_PRICE_TEXT,
} from "../src/lib/pricing-config";
import {
  BOOKING_ADDONS,
  BOOKING_PACKAGES,
  budgetRangeFromPackage,
} from "../src/lib/booking-packages";

const expectedPrices: Record<string, number> = {
  "photo-entry": 225,
  "photo-signature": 450,
  "photo-premium": 1350,
  "video-entry": 450,
  "video-signature": 950,
  "video-premium": 3500,
  "monthly-entry": 650,
  "monthly-signature": 1350,
  "monthly-premium": 4250,
};

console.log("\nPricing consistency");

assert.equal(PRICING_STATUS, "approved_for_90_day_validation");
assert.equal(APPROVED_PRICING_PACKAGES.length, 9);
assert.equal(new Set(APPROVED_PRICING_PACKAGES.map((pkg) => pkg.id)).size, 9);
assert.deepEqual(
  Object.fromEntries(APPROVED_PRICING_PACKAGES.map((pkg) => [pkg.id, pkg.price])),
  expectedPrices
);

for (const family of ["portrait", "motion", "partnership"] as const) {
  const familyPackages = APPROVED_PRICING_PACKAGES.filter((pkg) => pkg.family === family);
  assert.deepEqual(
    familyPackages.map((pkg) => pkg.level),
    ["entry", "signature", "premium"]
  );
}

assert.equal(BOOKING_PACKAGES.length, APPROVED_PRICING_PACKAGES.length);
assert.equal(BOOKING_ADDONS.length, 0, "unvalidated add-on prices must stay private");
assert.ok(
  APPROVED_PRICING_PACKAGES.filter((pkg) => pkg.family === "partnership").every(
    (pkg) => pkg.billing === "monthly"
  )
);
assert.equal(budgetRangeFromPackage("photo-entry"), "Under $250");
assert.equal(budgetRangeFromPackage("photo-signature"), "$250–749");
assert.equal(budgetRangeFromPackage("video-signature"), "$750–1,499");
assert.equal(budgetRangeFromPackage("video-premium"), "$3,500+");
assert.equal(SERVICE_STARTING_PRICE_TEXT.photography, "Photography from $225");
assert.equal(SERVICE_STARTING_PRICE_TEXT.videography, "Video from $450");
assert.equal(
  SERVICE_STARTING_PRICE_TEXT["monthly-partnerships"],
  "Monthly partnerships from $650/month"
);
assert.match(MEDIA_DELIVERY_DEFINITIONS.rawClip, /not included unless quoted/i);
assert.match(MEDIA_DELIVERY_DEFINITIONS.lightlyEditedClip, /5–15 second/);
assert.match(MEDIA_DELIVERY_DEFINITIONS.standardReel, /15–45 second/);
assert.match(MEDIA_DELIVERY_DEFINITIONS.advancedPromotionalFilm, /45–120 second/);

const publicCopy = JSON.stringify(APPROVED_PRICING_PACKAGES);
assert.doesNotMatch(publicCopy, /most popular|most chosen|unlimited/i);

console.log("  ✓ nine approved packages and exact test prices");
console.log("  ✓ public services, budget bands, and media definitions agree");
console.log("  ✓ retired add-ons and unsupported popularity claims are absent\n");
