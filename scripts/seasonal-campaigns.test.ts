import assert from "node:assert/strict";
import { DEFAULT_SEASONAL_CONFIG, HOLIDAY_EDITION_2026 } from "../src/lib/seasonal/defaults";
import {
  contrastRatio,
  resolveSeasonal,
  zonedTimeToEpoch,
} from "../src/lib/seasonal/resolve";
import { parseCampaignTag } from "../src/lib/seasonal/inquiry-tag";
import { seasonalNavLink } from "../src/lib/seasonal/links";
import { contactSchema, bookingSchema } from "../src/lib/validation";
import { isSafeHref, isSafeMediaUrl, seasonalConfigSchema, type SeasonalConfig } from "../src/lib/seasonal/schema";

const with_ = (patch: Partial<SeasonalConfig>, campaignPatch: Partial<typeof HOLIDAY_EDITION_2026> = {}): SeasonalConfig => ({
  ...DEFAULT_SEASONAL_CONFIG,
  ...patch,
  campaigns: [{ ...HOLIDAY_EDITION_2026, ...campaignPatch }],
});

const PT = "America/Los_Angeles";
const iso = (s: string) => Date.parse(s);

// Defaults are valid and ship as Default ÉLEVÉ.
assert.ok(seasonalConfigSchema.safeParse(DEFAULT_SEASONAL_CONFIG).success, "default config must validate");
assert.equal(resolveSeasonal(DEFAULT_SEASONAL_CONFIG).campaign, null);
assert.equal(resolveSeasonal(DEFAULT_SEASONAL_CONFIG).reason, "default-mode");

// Time-zone conversion, including both DST transitions.
assert.equal(zonedTimeToEpoch("2026-11-27T00:00", PT), iso("2026-11-27T08:00:00Z")); // PST
assert.equal(zonedTimeToEpoch("2027-01-05T00:00", PT), iso("2027-01-05T08:00:00Z"));
assert.equal(zonedTimeToEpoch("2026-07-01T00:00", PT), iso("2026-07-01T07:00:00Z")); // PDT
assert.equal(zonedTimeToEpoch("2026-11-01T12:00", PT), iso("2026-11-01T20:00:00Z")); // day DST ends
assert.equal(zonedTimeToEpoch("2026-03-08T12:00", PT), iso("2026-03-08T19:00:00Z")); // day DST starts
assert.equal(zonedTimeToEpoch("2026-11-27T00:00", "Not/AZone"), null);
assert.equal(zonedTimeToEpoch("2026-13-01T00:00", PT), null);
assert.equal(zonedTimeToEpoch("garbage", PT), null);

// Malformed / missing config always falls back to Default ÉLEVÉ.
for (const bad of [null, undefined, "", 42, {}, { version: 2 }, { ...DEFAULT_SEASONAL_CONFIG, mode: "holiday" }]) {
  const r = resolveSeasonal(bad);
  assert.equal(r.campaign, null);
  assert.equal(r.reason, "invalid-config");
}
assert.equal(resolveSeasonal(with_({ activeCampaignId: "missing" })).reason, "invalid-config");

// Manual override ignores dates (even long after the schedule ends).
const manual = resolveSeasonal(with_({ mode: "campaign" }), iso("2030-01-01T00:00:00Z"));
assert.equal(manual.campaign?.id, "holiday-2026");
assert.equal(manual.reason, "manual");

// Kill switch beats manual and scheduled.
assert.equal(resolveSeasonal(with_({ mode: "campaign" }, { enabled: false })).campaign, null);
assert.equal(
  resolveSeasonal(with_({ mode: "scheduled" }, { enabled: false }), iso("2026-12-15T12:00:00Z")).reason,
  "campaign-disabled"
);

// Scheduled: boundaries are start-inclusive, end-exclusive, in Pacific time.
const scheduled = with_({ mode: "scheduled" });
const start = iso("2026-11-27T08:00:00Z");
const end = iso("2027-01-05T08:00:00Z");
assert.equal(resolveSeasonal(scheduled, start - 1).reason, "scheduled-upcoming");
assert.equal(resolveSeasonal(scheduled, start - 1).nextBoundary, start);
assert.equal(resolveSeasonal(scheduled, start).reason, "scheduled-active");
assert.equal(resolveSeasonal(scheduled, start).nextBoundary, end);
assert.equal(resolveSeasonal(scheduled, iso("2027-01-04T23:59:00-08:00")).campaign?.id, "holiday-2026");
assert.equal(resolveSeasonal(scheduled, end).campaign, null);
assert.equal(resolveSeasonal(scheduled, end).reason, "scheduled-ended");

// Default mode ignores an active schedule window.
assert.equal(resolveSeasonal(with_({ mode: "default" }), iso("2026-12-15T12:00:00Z")).campaign, null);

// Invalid schedule (end before start) is never live.
const backwards = with_({ mode: "scheduled" }, {
  schedule: { start: "2027-01-05T00:00", end: "2026-11-27T00:00", timeZone: PT },
});
assert.equal(resolveSeasonal(backwards, iso("2026-12-15T12:00:00Z")).reason, "invalid-schedule");

// Server-side validation rejects unsafe links and foreign media.
assert.ok(isSafeHref("/book?package=photo-signature"));
assert.ok(isSafeHref("#holiday-edition"));
assert.ok(isSafeHref("https://www.eleve-visuals.com/portfolio"));
assert.ok(!isSafeHref("javascript:alert(1)"));
assert.ok(!isSafeHref("//evil.example"));
assert.ok(!isSafeHref("http://insecure.example"));
assert.ok(isSafeMediaUrl("https://abc.public.blob.vercel-storage.com/holiday.jpg"));
assert.ok(isSafeMediaUrl("/images/holiday.jpg"));
assert.ok(!isSafeMediaUrl("https://images.example.com/stock.jpg"));
const badLink = with_({}, { primaryCta: { label: "x", href: "javascript:alert(1)" } });
assert.equal(seasonalConfigSchema.safeParse(badLink).success, false);
const dup = { ...DEFAULT_SEASONAL_CONFIG, campaigns: [HOLIDAY_EDITION_2026, HOLIDAY_EDITION_2026] };
assert.equal(seasonalConfigSchema.safeParse(dup).success, false);

// Holiday Edition palette meets WCAG AA for text it is used for.
const a = HOLIDAY_EDITION_2026.accent;
assert.ok(contrastRatio(a.cream, a.onyx) >= 4.5, "cream on onyx");
assert.ok(contrastRatio(a.gold, a.onyx) >= 4.5, "gold on onyx");
assert.ok(contrastRatio(a.cream, a.burgundy) >= 4.5, "cream on burgundy");

// Campaign CTAs carry the campaign tag and never point at Sessions / Mask Off applications.
for (const card of HOLIDAY_EDITION_2026.experience.cards) {
  assert.ok(card.cta.href.includes("campaign=holiday-2026"), `${card.id} carries campaign tag`);
  assert.ok(!card.cta.href.startsWith("/sessions"), `${card.id} does not route to Sessions applications`);
}

// Inquiry tagging: parsed from CTA links, accepted by schemas, optional for normal inquiries.
assert.deepEqual(parseCampaignTag("?campaign=holiday-2026&interest=gift"), { campaign: "holiday-2026", campaignInterest: "gift" });
assert.deepEqual(parseCampaignTag("?package=photo-signature&campaign=holiday-2026"), { campaign: "holiday-2026" });
assert.equal(parseCampaignTag("?campaign=<script>"), null);
assert.equal(parseCampaignTag(""), null);
const contactBase = { name: "Test", email: "test@example.com", subject: "Hello", message: "A message long enough." };
assert.ok(contactSchema.safeParse(contactBase).success, "contact without campaign still valid");
const taggedContact = contactSchema.safeParse({ ...contactBase, campaign: "holiday-2026", campaignInterest: "gift" });
assert.ok(taggedContact.success && taggedContact.data.campaign === "holiday-2026", "campaign stored on contact");
assert.equal(contactSchema.safeParse({ ...contactBase, campaign: "Bad Tag!" }).success, false);
assert.ok("campaign" in bookingSchema.shape && "campaignInterest" in bookingSchema.shape, "booking schema carries campaign tag");

// Nav item links to the landing page, or the homepage section, or nothing.
assert.deepEqual(seasonalNavLink(HOLIDAY_EDITION_2026), { label: "Holiday Edition", href: "/editions/holiday" });
assert.deepEqual(
  seasonalNavLink({ ...HOLIDAY_EDITION_2026, sections: { hero: true, experience: true, landingPage: false } }),
  { label: "Holiday Edition", href: "/#holiday-edition" }
);
assert.equal(seasonalNavLink({ ...HOLIDAY_EDITION_2026, nav: { enabled: false, label: "x" } }), null);

console.log("Seasonal campaign checks passed.");
