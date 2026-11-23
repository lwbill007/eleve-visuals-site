/**
 * Campaign tag carried from a seasonal CTA (?campaign=holiday-2026&interest=gift)
 * into the existing booking/contact forms, so seasonal leads are measurable
 * without separate forms. Stored inside Submission.data (no migration).
 */
export const CAMPAIGN_TAG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

export interface CampaignTag {
  campaign: string;
  campaignInterest?: string;
}

export function parseCampaignTag(search: string): CampaignTag | null {
  const params = new URLSearchParams(search);
  const campaign = params.get("campaign")?.trim().toLowerCase() ?? "";
  if (!CAMPAIGN_TAG_PATTERN.test(campaign)) return null;
  const interest = params.get("interest")?.trim().toLowerCase() ?? "";
  return CAMPAIGN_TAG_PATTERN.test(interest) ? { campaign, campaignInterest: interest } : { campaign };
}

export function readCampaignTag(): CampaignTag | null {
  if (typeof window === "undefined") return null;
  return parseCampaignTag(window.location.search);
}
