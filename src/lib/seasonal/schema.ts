import { z } from "zod";

/**
 * Seasonal Campaigns — data model shared by the admin, the API and the
 * public site. Campaigns are overlays: they never write to the default
 * `hero` / `homepage` / `navigation` content, so turning a campaign off
 * restores the original site exactly.
 */

export const SEASONAL_MODES = ["default", "campaign", "scheduled"] as const;
export type SeasonalMode = (typeof SEASONAL_MODES)[number];

export const SEASONAL_MODE_LABELS: Record<SeasonalMode, string> = {
  default: "Default ÉLEVÉ",
  campaign: "Campaign on (manual)",
  scheduled: "Scheduled",
};

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Internal paths, in-page anchors, or https links. Never javascript:/data:. */
export function isSafeHref(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("//")) return false;
  if (v.startsWith("/") || v.startsWith("#")) return !/\s/.test(v);
  try {
    const url = new URL(v);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Media must come from the site's own storage (Vercel Blob) or the site's
 * own /public folder — the same hosts next/image is configured for.
 */
export function isSafeMediaUrl(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return !/\s/.test(v);
  try {
    const url = new URL(v);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const href = z.string().trim().max(500).refine(isSafeHref, "Use a site path (/book) or an https link");
const media = z
  .string()
  .trim()
  .max(1000)
  .refine(isSafeMediaUrl, "Use an image uploaded to the ÉLEVÉ media library")
  .nullable();

export const ctaSchema = z.object({
  label: requiredText(60),
  href,
});

export const serviceCardSchema = z.object({
  id: z.string().regex(SLUG),
  enabled: z.boolean(),
  eyebrow: text(80),
  title: requiredText(80),
  description: requiredText(600),
  note: text(200),
  image: media,
  imageAlt: text(200),
  cta: ctaSchema,
});

export const accentSchema = z.object({
  onyx: z.string().regex(HEX),
  cream: z.string().regex(HEX),
  gold: z.string().regex(HEX),
  burgundy: z.string().regex(HEX),
});

export const scheduleSchema = z.object({
  /** Wall-clock time in `timeZone`, e.g. 2026-11-27T00:00. Campaign is on from this moment. */
  start: z.string().regex(LOCAL_DATETIME),
  /** Wall-clock time in `timeZone`. Campaign is off from this moment (exclusive). */
  end: z.string().regex(LOCAL_DATETIME),
  timeZone: z.string().min(1).max(64),
});

export const campaignSchema = z.object({
  id: z.string().regex(SLUG),
  /** URL segment for the landing page: /editions/{slug} */
  slug: z.string().regex(SLUG),
  /** Tag stored on inquiries and analytics events, e.g. holiday-2026. */
  trackingId: z.string().regex(SLUG),
  enabled: z.boolean(),
  name: requiredText(80),
  subtitle: text(120),
  headline: requiredText(120),
  description: text(400),
  secondaryLine: text(200),
  heroImageDesktop: media,
  heroImageMobile: media,
  heroImageAlt: text(200),
  heroVideo: media,
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
  announcement: z.object({ enabled: z.boolean(), text: text(160), href: z.union([href, z.literal("")]) }),
  nav: z.object({ enabled: z.boolean(), label: text(40) }),
  sections: z.object({
    hero: z.boolean(),
    experience: z.boolean(),
    landingPage: z.boolean(),
  }),
  accent: accentSchema,
  experience: z.object({
    eyebrow: text(80),
    heading: requiredText(120),
    intro: text(400),
    cards: z.array(serviceCardSchema).max(6),
  }),
  schedule: scheduleSchema,
});

export const seasonalConfigSchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(SEASONAL_MODES),
    activeCampaignId: z.string().regex(SLUG),
    campaigns: z.array(campaignSchema).min(1).max(24),
    updatedAt: z.string().nullable(),
    updatedBy: z.string().nullable(),
  })
  .superRefine((config, ctx) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    config.campaigns.forEach((c, i) => {
      if (ids.has(c.id)) ctx.addIssue({ code: "custom", path: ["campaigns", i, "id"], message: "Duplicate campaign id" });
      if (slugs.has(c.slug)) ctx.addIssue({ code: "custom", path: ["campaigns", i, "slug"], message: "Duplicate landing page slug" });
      ids.add(c.id);
      slugs.add(c.slug);
    });
    if (!ids.has(config.activeCampaignId)) {
      ctx.addIssue({ code: "custom", path: ["activeCampaignId"], message: "Selected campaign does not exist" });
    }
  });

export type SeasonalCta = z.infer<typeof ctaSchema>;
export type SeasonalServiceCard = z.infer<typeof serviceCardSchema>;
export type SeasonalAccent = z.infer<typeof accentSchema>;
export type SeasonalSchedule = z.infer<typeof scheduleSchema>;
export type SeasonalCampaign = z.infer<typeof campaignSchema>;
export type SeasonalConfig = z.infer<typeof seasonalConfigSchema>;

export interface SeasonalHistoryEntry {
  config: SeasonalConfig;
  publishedAt: string;
  publishedBy: string | null;
}

/** Flatten zod issues into "path: message" strings for admin display. */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
