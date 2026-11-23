import type { CSSProperties } from "react";
import type { SeasonalCampaign } from "@/lib/seasonal/schema";

/** CSS custom properties for a campaign's accents (values are validated #RRGGBB). */
export function seasonStyle(campaign: SeasonalCampaign): CSSProperties {
  return {
    "--season-onyx": campaign.accent.onyx,
    "--season-cream": campaign.accent.cream,
    "--season-gold": campaign.accent.gold,
    "--season-burgundy": campaign.accent.burgundy,
  } as CSSProperties;
}

/** "A Season to Remember." → ["A Season", "to Remember."] for an editorial two-line break. */
export function splitHeadline(headline: string): [string, string | null] {
  const words = headline.trim().split(/\s+/);
  if (words.length < 3) return [headline.trim(), null];
  const breakAt = words.findIndex((w, i) => i > 0 && /^(to|of|for|and|in|with)$/i.test(w));
  const at = breakAt > 0 ? breakAt : Math.ceil(words.length / 2);
  return [words.slice(0, at).join(" "), words.slice(at).join(" ")];
}
