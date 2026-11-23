import { seasonalConfigSchema, type SeasonalCampaign, type SeasonalConfig, type SeasonalMode } from "./schema";

/**
 * Pure, dependency-free resolution of "what does the public site show right now".
 *
 * Precedence (first match wins):
 *  1. Config missing or malformed            → Default ÉLEVÉ
 *  2. Selected campaign disabled (kill switch) → Default ÉLEVÉ
 *  3. mode = "default"                        → Default ÉLEVÉ
 *  4. mode = "campaign" (manual override)     → campaign on, dates ignored
 *  5. mode = "scheduled"                      → on only while start ≤ now < end
 */

export type SeasonalReason =
  | "invalid-config"
  | "campaign-disabled"
  | "default-mode"
  | "manual"
  | "scheduled-upcoming"
  | "scheduled-active"
  | "scheduled-ended"
  | "invalid-schedule";

export interface SeasonalResolution {
  campaign: SeasonalCampaign | null;
  reason: SeasonalReason;
  mode: SeasonalMode;
  /** Next moment (epoch ms) at which the result will change, if scheduled. */
  nextBoundary: number | null;
}

function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Convert "YYYY-MM-DDTHH:mm" wall-clock time in an IANA zone to epoch ms. */
export function zonedTimeToEpoch(local: string, timeZone: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  try {
    let guess = wall - offsetMs(wall, timeZone);
    guess = wall - offsetMs(guess, timeZone);
    return guess;
  } catch {
    return null; // invalid time zone
  }
}

export function scheduleWindow(campaign: SeasonalCampaign): { start: number; end: number } | null {
  const start = zonedTimeToEpoch(campaign.schedule.start, campaign.schedule.timeZone);
  const end = zonedTimeToEpoch(campaign.schedule.end, campaign.schedule.timeZone);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

export function parseSeasonalConfig(raw: unknown): SeasonalConfig | null {
  const parsed = seasonalConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveSeasonal(raw: unknown, now: number = Date.now()): SeasonalResolution {
  const config = parseSeasonalConfig(raw);
  if (!config) return { campaign: null, reason: "invalid-config", mode: "default", nextBoundary: null };

  const campaign = config.campaigns.find((c) => c.id === config.activeCampaignId);
  if (!campaign) return { campaign: null, reason: "invalid-config", mode: "default", nextBoundary: null };
  if (!campaign.enabled) {
    return { campaign: null, reason: "campaign-disabled", mode: config.mode, nextBoundary: null };
  }

  switch (config.mode) {
    case "default":
      return { campaign: null, reason: "default-mode", mode: "default", nextBoundary: null };
    case "campaign":
      return { campaign, reason: "manual", mode: "campaign", nextBoundary: null };
    case "scheduled": {
      const window = scheduleWindow(campaign);
      if (!window) return { campaign: null, reason: "invalid-schedule", mode: "scheduled", nextBoundary: null };
      if (now < window.start) {
        return { campaign: null, reason: "scheduled-upcoming", mode: "scheduled", nextBoundary: window.start };
      }
      if (now < window.end) {
        return { campaign, reason: "scheduled-active", mode: "scheduled", nextBoundary: window.end };
      }
      return { campaign: null, reason: "scheduled-ended", mode: "scheduled", nextBoundary: null };
    }
  }
}

export const SEASONAL_REASON_LABELS: Record<SeasonalReason, string> = {
  "invalid-config": "Default ÉLEVÉ: campaign settings are unreadable, so the safe default is showing.",
  "campaign-disabled": "Default ÉLEVÉ: the selected campaign is switched off.",
  "default-mode": "Default ÉLEVÉ is showing.",
  manual: "Campaign is live (manual override, dates ignored).",
  "scheduled-upcoming": "Default ÉLEVÉ until the scheduled start.",
  "scheduled-active": "Campaign is live on schedule.",
  "scheduled-ended": "Default ÉLEVÉ: the scheduled campaign has ended.",
  "invalid-schedule": "Default ÉLEVÉ: the schedule is invalid (check dates and time zone).",
};

/** WCAG relative-luminance contrast ratio between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
