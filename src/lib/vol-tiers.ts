/**
 * ÉLEVÉ VOL. participation tiers (approved 2026-11-23).
 *
 * Deliberately separate from the commercial BOOK ÉLEVÉ catalog
 * (pricing-config.ts): different division, different economics. Nothing here
 * may be used by booking, deposits or commercial pricing.
 *
 * Each tier carries a post-production time budget so deliverables stay
 * supportable by the price. Payment happens only after acceptance and tier
 * confirmation; no tier buys casting, publication or placement.
 */

export const VOL_TIER_IDS = ["free", "entry", "select", "featured", "signature"] as const;
export type VolTierId = (typeof VOL_TIER_IDS)[number];

export interface VolTier {
  id: VolTierId;
  name: string;
  tagline: string;
  /** USD, whole dollars. */
  price: number;
  finalPhotos: number;
  cleanRetouches: number;
  signatureRetouches: number;
  maxLooks: number;
  /** Individual time on set. */
  onSet: string;
  soloMinutes: number;
  layouts: number;
  prints: number;
  correctionRequests: number;
  priority: boolean;
  deliveryBusinessDays: number;
  /** Internal planning figure, never shown publicly. */
  postBudgetMinutes: number;
}

export const VOL_TIERS: readonly VolTier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Creative participation",
    price: 0,
    finalPhotos: 2,
    cleanRetouches: 0,
    signatureRetouches: 0,
    maxLooks: 1,
    onSet: "Group creative direction",
    soloMinutes: 0,
    layouts: 0,
    prints: 0,
    correctionRequests: 0,
    priority: false,
    deliveryBusinessDays: 10,
    postBudgetMinutes: 15,
  },
  {
    id: "entry",
    name: "Entry",
    tagline: "Essential portrait experience",
    price: 25,
    finalPhotos: 4,
    cleanRetouches: 1,
    signatureRetouches: 0,
    maxLooks: 1,
    onSet: "Individual posing guidance",
    soloMinutes: 0,
    layouts: 0,
    prints: 0,
    correctionRequests: 0,
    priority: false,
    deliveryBusinessDays: 7,
    postBudgetMinutes: 30,
  },
  {
    id: "select",
    name: "Select",
    tagline: "Enhanced portrait experience",
    price: 45,
    finalPhotos: 6,
    cleanRetouches: 2,
    signatureRetouches: 0,
    maxLooks: 2,
    onSet: "Individual posing guidance",
    soloMinutes: 0,
    layouts: 0,
    prints: 0,
    correctionRequests: 0,
    priority: false,
    deliveryBusinessDays: 7,
    postBudgetMinutes: 45,
  },
  {
    id: "featured",
    name: "Featured",
    tagline: "Premium editorial experience",
    price: 95,
    finalPhotos: 10,
    cleanRetouches: 3,
    signatureRetouches: 1,
    maxLooks: 2,
    onSet: "5-minute solo segment",
    soloMinutes: 5,
    layouts: 1,
    prints: 0,
    correctionRequests: 0,
    priority: true,
    deliveryBusinessDays: 5,
    postBudgetMinutes: 105,
  },
  {
    id: "signature",
    name: "Signature",
    tagline: "Complete editorial experience",
    price: 175,
    finalPhotos: 12,
    cleanRetouches: 4,
    signatureRetouches: 2,
    maxLooks: 3,
    onSet: "10-minute solo segment",
    soloMinutes: 10,
    layouts: 2,
    prints: 1,
    correctionRequests: 1,
    priority: true,
    deliveryBusinessDays: 5,
    postBudgetMinutes: 185,
  },
];

export const VOL_FINISHING_LEVELS = [
  {
    name: "Editorial finish",
    detail: "Colour, exposure, crop and light clean-up, graded in the production's look. Every photo.",
  },
  {
    name: "Clean retouch",
    detail: "Editorial finish plus blemishes, flyaways and stray marks.",
  },
  {
    name: "Signature retouch",
    detail: "Clean retouch plus detailed skin, dodge-and-burn and shape and colour refinement.",
  },
  {
    name: "Editorial layout",
    detail: "A magazine-style digital page of your images in the volume's design.",
  },
] as const;

/** Included in every tier. */
export const VOL_ALWAYS_INCLUDED = [
  "Free application. Selection is based on the concept, never on payment",
  "Private online proof gallery to choose your photos",
  "Digital delivery",
  "Personal and portfolio usage rights",
  "Editorial credit if your images are featured",
] as const;

/** Never included in any tier. */
export const VOL_NEVER_INCLUDED = [
  "Guaranteed casting, publication, cover or placement",
  "Unlimited edits",
  "Commercial licensing (quoted separately)",
  "Special wardrobe, makeup, or travel to other locations",
] as const;

/** How payment works. Wording follows proposal D-3 / D-4 (2026-11-23). */
export const VOL_POLICIES = [
  {
    title: "Selection comes first",
    body: "Everyone applies free. Your preferred experience is not considered when we cast. Paying never secures a place, a cover or publication.",
  },
  {
    title: "Pay only after acceptance",
    body: "If you're selected, we confirm your experience and send a payment link or invoice. Payment is due within 5 days of confirming.",
  },
  {
    title: "No payment, still cast",
    body: "If you choose not to pay, or miss the deadline, you keep your place on the Free experience.",
  },
  {
    title: "Refunds",
    body: "Full refund if we cancel or reschedule the production and you can't attend. Experiences are not refundable after the shoot.",
  },
  {
    title: "Looks and timing",
    body: "Additional looks and solo time depend on the production's schedule and are offered when it allows.",
  },
] as const;

export function getVolTier(id: string | null | undefined): VolTier | undefined {
  return VOL_TIERS.find((tier) => tier.id === id);
}

export function isVolTierId(value: unknown): value is VolTierId {
  return typeof value === "string" && (VOL_TIER_IDS as readonly string[]).includes(value);
}

/** Tiers a volume offers, in catalog order. An empty or invalid list means all tiers. */
export function offeredVolTiers(ids: readonly string[] | null | undefined): VolTier[] {
  const wanted = (ids ?? []).filter(isVolTierId);
  if (wanted.length === 0) return [...VOL_TIERS];
  const set = new Set<string>(wanted);
  // Free is always available: nobody has to pay to take part.
  set.add("free");
  return VOL_TIERS.filter((tier) => set.has(tier.id));
}

/** Applicant roles that receive portraits and can choose a tier. Collaborators get agreements instead. */
export const VOL_TIER_PARTICIPANT_ROLES = ["Model"] as const;

export function rolesCanChooseTier(roles: readonly string[]): boolean {
  return roles.some((role) => (VOL_TIER_PARTICIPANT_ROLES as readonly string[]).includes(role));
}

export function formatVolPrice(price: number): string {
  return `$${price}`;
}

/** Comparison rows for the public table. */
export function volComparisonRows(tiers: readonly VolTier[]): { label: string; values: string[] }[] {
  const dash = (n: number, unit = "") => (n > 0 ? `${n}${unit}` : "—");
  return [
    { label: "Final edited photos", values: tiers.map((t) => String(t.finalPhotos)) },
    { label: "Clean retouches", values: tiers.map((t) => dash(t.cleanRetouches)) },
    { label: "Signature retouches", values: tiers.map((t) => dash(t.signatureRetouches)) },
    { label: "Looks (when the production allows)", values: tiers.map((t) => String(t.maxLooks)) },
    { label: "Solo time on set", values: tiers.map((t) => (t.soloMinutes ? `${t.soloMinutes} min` : "—")) },
    { label: "Editorial layouts", values: tiers.map((t) => dash(t.layouts)) },
    { label: "8×10 print", values: tiers.map((t) => dash(t.prints)) },
    { label: "Correction request", values: tiers.map((t) => dash(t.correctionRequests)) },
    { label: "Priority editing", values: tiers.map((t) => (t.priority ? "Yes" : "—")) },
    { label: "Delivery (business days)", values: tiers.map((t) => String(t.deliveryBusinessDays)) },
  ];
}

/**
 * Server-side: keep a tier preference only if the volume offers tiers, the
 * applicant's roles can choose one, and the tier is offered. Otherwise "".
 */
export function cleanExperiencePreference(
  value: unknown,
  roles: readonly string[],
  settings: { tiersEnabled?: boolean; tiersOffered?: readonly string[] }
): string {
  if (!settings.tiersEnabled || !rolesCanChooseTier(roles) || !isVolTierId(value)) return "";
  return offeredVolTiers(settings.tiersOffered).some((tier) => tier.id === value) ? value : "";
}
