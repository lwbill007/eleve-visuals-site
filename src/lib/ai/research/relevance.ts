/**
 * Business relevance filter — ignore noise that doesn't affect ÉLEVÉ.
 */

import type { BusinessRelevanceAxis, BusinessRelevanceResult } from "./types";

const AXIS_PATTERNS: Record<BusinessRelevanceAxis, RegExp> = {
  revenue: /\b(revenue|pricing|package|retainer|membership|roi|ltv|apv|profit)\b/i,
  bookings: /\b(booking|inquiry|consultation|lead|conversion|funnel)\b/i,
  seo: /\b(seo|search|indexing|core web vitals|serp|ai search|ctr|ranking)\b/i,
  marketing: /\b(instagram|tiktok|meta|ads|campaign|reach|algorithm|email marketing)\b/i,
  client_experience: /\b(client|customer|ux|booking flow|gallery|delivery|satisfaction)\b/i,
  creative_quality: /\b(creative|portfolio|editorial|lighting|color|brand|visual)\b/i,
  operations: /\b(ops|workflow|automation|production|permit|weather|schedule|crm)\b/i,
};

/** Cosmetic / low-value social noise that should not alert leadership */
const NOISE =
  /\b(new (font|emoji|sticker|filter|theme|skin)|cosmetic update|ui chrome|rebrand color of the week)\b/i;

const HIGH_SIGNAL =
  /\b(algorithm|reach|core update|security|outage|pricing|tax|ada|privacy|breaking|deprecat|api change|fw update|firmware)\b/i;

export function evaluateBusinessRelevance(query: string): BusinessRelevanceResult {
  const axes = (Object.keys(AXIS_PATTERNS) as BusinessRelevanceAxis[]).map((axis) => ({
    axis,
    affected: AXIS_PATTERNS[axis].test(query),
  }));

  const anyAxis = axes.some((a) => a.affected);
  const looksNoise = NOISE.test(query) && !HIGH_SIGNAL.test(query);

  if (looksNoise) {
    return {
      relevant: false,
      axes,
      reason: "Filtered as low-value noise — does not materially affect revenue, bookings, SEO, marketing, CX, creative, or operations.",
      ignoredAsNoise: true,
    };
  }

  if (!anyAxis && HIGH_SIGNAL.test(query)) {
    return {
      relevant: true,
      axes: axes.map((a) =>
        a.axis === "operations" || a.axis === "marketing" ? { ...a, affected: true } : a
      ),
      reason: "High-signal change detected — treating as material until proven otherwise.",
      ignoredAsNoise: false,
    };
  }

  return {
    relevant: anyAxis,
    axes,
    reason: anyAxis
      ? `Affects: ${axes
          .filter((a) => a.affected)
          .map((a) => a.axis)
          .join(", ")}`
      : "No clear link to revenue, bookings, SEO, marketing, client experience, creative quality, or operations.",
    ignoredAsNoise: false,
  };
}
