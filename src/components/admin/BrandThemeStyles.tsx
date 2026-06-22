import type { BrandColors } from "@/lib/types";
import { DEFAULT_BRAND_COLORS } from "@/lib/defaults";

export function BrandThemeStyles({ colors }: { colors?: Partial<BrandColors> }) {
  const c = { ...DEFAULT_BRAND_COLORS, ...colors };
  const css = `:root {
  --color-ink: ${c.ink};
  --color-charcoal: ${c.charcoal};
  --color-stone: ${c.stone};
  --color-muted: ${c.muted};
  --color-fog: ${c.fog};
  --color-cream: ${c.cream};
  --color-cream-dim: ${c.creamDim};
  --color-accent: ${c.accent};
  --color-accent-dim: ${c.accentDim};
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
