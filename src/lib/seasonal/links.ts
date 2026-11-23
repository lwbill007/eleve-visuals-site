import type { SeasonalCampaign } from "./schema";

export function landingPath(campaign: SeasonalCampaign) {
  return `/editions/${campaign.slug}`;
}

/** Nav item for an active campaign, or null when it has nowhere to link. */
export function seasonalNavLink(campaign: SeasonalCampaign): { label: string; href: string } | null {
  if (!campaign.nav.enabled || !campaign.nav.label.trim()) return null;
  if (campaign.sections.landingPage) return { label: campaign.nav.label, href: landingPath(campaign) };
  if (campaign.sections.experience) return { label: campaign.nav.label, href: `/#${campaign.slug}-edition` };
  return null;
}
