import type { BrandColors } from "@/lib/types";
import { DEFAULT_BRAND_COLORS } from "@/lib/defaults";

const CSS_COLOR =
  /^(#[0-9A-Fa-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\))$/;

function sanitizeCssColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return CSS_COLOR.test(trimmed) ? trimmed : fallback;
}

export function sanitizeBrandColors(colors?: Partial<BrandColors>): BrandColors {
  const defaults = DEFAULT_BRAND_COLORS;
  const c = { ...defaults, ...colors };
  return {
    ink: sanitizeCssColor(c.ink, defaults.ink),
    charcoal: sanitizeCssColor(c.charcoal, defaults.charcoal),
    stone: sanitizeCssColor(c.stone, defaults.stone),
    muted: sanitizeCssColor(c.muted, defaults.muted),
    fog: sanitizeCssColor(c.fog, defaults.fog),
    cream: sanitizeCssColor(c.cream, defaults.cream),
    creamDim: sanitizeCssColor(c.creamDim, defaults.creamDim),
    accent: sanitizeCssColor(c.accent, defaults.accent),
    accentDim: sanitizeCssColor(c.accentDim, defaults.accentDim),
  };
}
