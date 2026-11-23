import type { SeasonalCampaign, SeasonalConfig } from "./schema";

export const HOLIDAY_2026_TRACKING_ID = "holiday-2026";

/**
 * The Holiday Edition 2026 — first campaign on the Seasonal Campaigns system.
 * Copy comes from the approved campaign brief. No prices, discounts, scarcity
 * or performance claims. Image slots start empty: the public design is
 * typographic until approved, rights-cleared ÉLEVÉ imagery is chosen in admin.
 */
export const HOLIDAY_EDITION_2026: SeasonalCampaign = {
  id: "holiday-2026",
  slug: "holiday",
  trackingId: HOLIDAY_2026_TRACKING_ID,
  enabled: true,
  name: "The Holiday Edition",
  subtitle: "The Holiday Edition / 2026",
  headline: "A Season to Remember.",
  description: "The moments. The people. The feeling. Captured with intention.",
  secondaryLine: "Some moments deserve more than a memory.",
  heroImageDesktop: null,
  heroImageMobile: null,
  heroImageAlt: "",
  heroVideo: null,
  primaryCta: { label: "Explore Holiday Sessions", href: "/editions/holiday" },
  secondaryCta: { label: "View Our Work", href: "/portfolio" },
  announcement: {
    enabled: true,
    text: "Holiday portraits · Gift experiences · Seasonal campaigns",
    href: "/editions/holiday",
  },
  nav: { enabled: true, label: "Holiday Edition" },
  sections: { hero: true, experience: true, landingPage: true },
  accent: {
    onyx: "#111111",
    cream: "#F4EBDD",
    gold: "#C6A66B",
    burgundy: "#571E2B",
  },
  experience: {
    eyebrow: "The Holiday Edition",
    heading: "Three ways to keep the season.",
    intro: "Some moments deserve more than a memory.",
    cards: [
      {
        id: "portraits",
        enabled: true,
        eyebrow: "Individuals · Couples · Families",
        title: "Holiday Portraits",
        description:
          "Editorial portraits for individuals, couples and families. Directed, lit and finished with intention, so the season looks the way it felt.",
        note: "",
        image: null,
        imageAlt: "",
        cta: {
          label: "Inquire About Portraits",
          href: "/book?package=photo-signature&campaign=holiday-2026&interest=portraits",
        },
      },
      {
        id: "gift",
        enabled: true,
        eyebrow: "A photography experience, given",
        title: "The Gift of ÉLEVÉ",
        description:
          "Give someone a photography experience planned around them. Tell us who it's for and what you have in mind, and we'll come back with how it could work.",
        note: "Arranged personally, by inquiry.",
        image: null,
        imageAlt: "",
        cta: {
          label: "Request a Gift Experience",
          href: "/contact?campaign=holiday-2026&interest=gift",
        },
      },
      {
        id: "campaign",
        enabled: true,
        eyebrow: "Businesses · Creators · Brands",
        title: "Holiday Campaigns",
        description:
          "Seasonal photography and short-form video for businesses, creators and brands, planned around your launch, your audience and your season.",
        note: "",
        image: null,
        imageAlt: "",
        cta: {
          label: "Plan a Campaign",
          href: "/book?campaign=holiday-2026&interest=campaign",
        },
      },
    ],
  },
  schedule: {
    start: "2026-11-27T00:00",
    // Exclusive end: the campaign runs through the whole of 4 January 2027.
    end: "2027-01-05T00:00",
    timeZone: "America/Los_Angeles",
  },
};

/** Safe starting state: Default ÉLEVÉ, Holiday Edition prepared but not live. */
export const DEFAULT_SEASONAL_CONFIG: SeasonalConfig = {
  version: 1,
  mode: "default",
  activeCampaignId: HOLIDAY_EDITION_2026.id,
  campaigns: [HOLIDAY_EDITION_2026],
  updatedAt: null,
  updatedBy: null,
};
