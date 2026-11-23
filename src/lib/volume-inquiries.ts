import { CAMPAIGN_TAG_PATTERN } from "./seasonal/inquiry-tag";

/**
 * Commercial pathways for a volume, kept apart from the free creative
 * application so nobody confuses a collaboration with a paid booking.
 * They reuse the contact form and its campaign tag (Submission.data.campaign /
 * campaignInterest), so they show up tagged in the admin Inbox.
 */
export const VOLUME_INQUIRY_PATHS = [
  {
    interest: "brand-partner",
    title: "Brand partner",
    description: "Sponsor the volume, or provide wardrobe, products or a location.",
    subject: "Brand partnership",
    cta: "Discuss a partnership",
  },
  {
    interest: "editorial-advertising",
    title: "Editorial advertiser",
    description: "Ask about paid placement in the published editorial.",
    subject: "Editorial advertising",
    cta: "Ask about placement",
  },
  {
    interest: "future-client",
    title: "Future client",
    description: "Join the interest list for paid portrait sessions in this concept. No booking or payment now.",
    subject: "Interest list: paid sessions",
    cta: "Join the interest list",
  },
] as const;

export type VolumeInquiryInterest = (typeof VOLUME_INQUIRY_PATHS)[number]["interest"];

/** Campaign tag for a volume: its slug when it fits the tag format. */
export function volumeCampaignTag(slug: string): string {
  const tag = slug.trim().toLowerCase();
  return CAMPAIGN_TAG_PATTERN.test(tag) ? tag : "sessions";
}

export function volumeInquiryHref(slug: string, interest: VolumeInquiryInterest): string {
  const params = new URLSearchParams({ campaign: volumeCampaignTag(slug), interest });
  return `/contact?${params.toString()}`;
}

/** Contact-form subject to prefill for a campaign interest, if any. */
export function subjectForInterest(interest: string | undefined, volumeLabel?: string): string | null {
  if (interest === "gift") return "Gift experience inquiry";
  const path = VOLUME_INQUIRY_PATHS.find((item) => item.interest === interest);
  if (!path) return null;
  return volumeLabel ? `${path.subject} — ${volumeLabel}` : path.subject;
}
