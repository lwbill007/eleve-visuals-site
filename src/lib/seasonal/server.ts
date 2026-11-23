import "server-only";
import { cache } from "react";
import { cookies, draftMode } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DEFAULT_SEASONAL_CONFIG } from "./defaults";
import { parseSeasonalConfig, resolveSeasonal, type SeasonalResolution } from "./resolve";
import type { SeasonalCampaign, SeasonalConfig, SeasonalHistoryEntry } from "./schema";

export const SEASONAL_KEYS = {
  published: "seasonalCampaigns",
  draft: "seasonalCampaignsDraft",
  history: "seasonalCampaignsHistory",
} as const;

export const SEASONAL_CACHE_TAG = "seasonal-campaigns";
export const SEASONAL_PREVIEW_COOKIE = "eleve-seasonal-preview";
export type SeasonalPreviewMode = "default" | "campaign";
const HISTORY_LIMIT = 10;

async function readJson(key: string): Promise<unknown> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  if (!row) return undefined;
  return JSON.parse(row.value) as unknown;
}

/** Published config straight from the DB. Unreadable → null (caller decides). */
export async function readPublishedConfig(): Promise<{ config: SeasonalConfig; stored: boolean; valid: boolean }> {
  try {
    const raw = await readJson(SEASONAL_KEYS.published);
    if (raw === undefined) return { config: DEFAULT_SEASONAL_CONFIG, stored: false, valid: true };
    const parsed = parseSeasonalConfig(raw);
    if (!parsed) return { config: DEFAULT_SEASONAL_CONFIG, stored: true, valid: false };
    return { config: parsed, stored: true, valid: true };
  } catch (error) {
    console.error("[seasonal] published config unavailable, using Default ÉLEVÉ:", error);
    return { config: DEFAULT_SEASONAL_CONFIG, stored: false, valid: false };
  }
}

export async function readDraftConfig(): Promise<{ config: SeasonalConfig; hasDraft: boolean }> {
  try {
    const raw = await readJson(SEASONAL_KEYS.draft);
    const parsed = raw === undefined ? null : parseSeasonalConfig(raw);
    if (parsed) return { config: parsed, hasDraft: true };
  } catch (error) {
    console.error("[seasonal] draft unreadable:", error);
  }
  return { config: (await readPublishedConfig()).config, hasDraft: false };
}

export async function readHistory(): Promise<SeasonalHistoryEntry[]> {
  try {
    const raw = await readJson(SEASONAL_KEYS.history);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (entry): entry is SeasonalHistoryEntry =>
        Boolean(entry) && typeof entry === "object" && parseSeasonalConfig((entry as SeasonalHistoryEntry).config) !== null
    );
  } catch {
    return [];
  }
}

function upsert(key: string, value: unknown) {
  const json = JSON.stringify(value);
  return prisma.siteContent.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

export async function saveDraft(config: SeasonalConfig) {
  await upsert(SEASONAL_KEYS.draft, config);
}

/**
 * Publish: the current published config is pushed onto the history stack and
 * the new one replaces it, in a single transaction. Default content is never touched.
 */
export async function publishConfig(config: SeasonalConfig, actor: string | null): Promise<SeasonalConfig> {
  const [current, history] = await Promise.all([readPublishedConfig(), readHistory()]);
  const now = new Date().toISOString();
  const next: SeasonalConfig = { ...config, updatedAt: now, updatedBy: actor };
  const nextHistory: SeasonalHistoryEntry[] = current.stored && current.valid
    ? [
        {
          config: current.config,
          publishedAt: current.config.updatedAt ?? now,
          publishedBy: current.config.updatedBy,
        },
        ...history,
      ].slice(0, HISTORY_LIMIT)
    : history;
  await prisma.$transaction([
    upsert(SEASONAL_KEYS.published, next),
    upsert(SEASONAL_KEYS.draft, next),
    upsert(SEASONAL_KEYS.history, nextHistory),
  ]);
  revalidateSeasonalSurfaces();
  return next;
}

/** Restore the most recent previous published config. */
export async function rollbackConfig(actor: string | null): Promise<SeasonalConfig | null> {
  const history = await readHistory();
  const [previous, ...rest] = history;
  if (!previous) return null;
  const restored: SeasonalConfig = {
    ...previous.config,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  await prisma.$transaction([
    upsert(SEASONAL_KEYS.published, restored),
    upsert(SEASONAL_KEYS.draft, restored),
    upsert(SEASONAL_KEYS.history, rest),
  ]);
  revalidateSeasonalSurfaces();
  return restored;
}

export function revalidateSeasonalSurfaces() {
  revalidateTag(SEASONAL_CACHE_TAG);
  // Header nav + announcement live in the shared layout: refresh every public page.
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}

const getCachedPublishedRaw = unstable_cache(
  async () => {
    const row = await prisma.siteContent.findUnique({ where: { key: SEASONAL_KEYS.published } });
    return row?.value ?? null;
  },
  ["seasonal-published-v1"],
  { revalidate: 60, tags: [SEASONAL_CACHE_TAG] }
);

async function publishedRaw(): Promise<unknown> {
  try {
    const value = await getCachedPublishedRaw();
    return value === null ? DEFAULT_SEASONAL_CONFIG : (JSON.parse(value) as unknown);
  } catch (error) {
    console.error("[seasonal] falling back to Default ÉLEVÉ:", error);
    return DEFAULT_SEASONAL_CONFIG;
  }
}

export interface PublicSeasonalState {
  campaign: SeasonalCampaign | null;
  /** Set only for a signed-in admin previewing; never for visitors. */
  preview: SeasonalPreviewMode | null;
  /** Epoch ms of the next scheduled change, for the stale-page guard. */
  nextBoundary: number | null;
}

/**
 * What the public site renders right now. Deduplicated per request so the
 * layout (nav, announcement) and the page (hero, section) always agree.
 */
export const getPublicSeasonalState = cache(async (): Promise<PublicSeasonalState> => {
  let preview: SeasonalPreviewMode | null = null;
  try {
    const draft = await draftMode();
    if (draft.isEnabled) {
      const session = await getSession();
      const forced = (await cookies()).get(SEASONAL_PREVIEW_COOKIE)?.value;
      if (session && (forced === "default" || forced === "campaign")) preview = forced;
    }
  } catch {
    preview = null;
  }

  if (preview) {
    const { config } = await readDraftConfig();
    const campaign = config.campaigns.find((c) => c.id === config.activeCampaignId) ?? null;
    return { campaign: preview === "campaign" ? campaign : null, preview, nextBoundary: null };
  }

  const resolution: SeasonalResolution = resolveSeasonal(await publishedRaw());
  return { campaign: resolution.campaign, preview: null, nextBoundary: resolution.nextBoundary };
});

/** Landing page lookup by slug, honouring preview. */
export async function getCampaignForLanding(slug: string): Promise<SeasonalCampaign | null> {
  const state = await getPublicSeasonalState();
  const campaign = state.campaign;
  if (!campaign || campaign.slug !== slug || !campaign.sections.landingPage) return null;
  return campaign;
}
