/**
 * Shared page metadata builder — unique title/description/canonical/OG/Twitter.
 */

import type { Metadata } from "next";
import type { SiteConfig } from "@/lib/types";
import { getSiteConfig } from "@/lib/content";
import { DEFAULT_SITE_CONFIG } from "@/lib/defaults";

export async function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const site = await getSiteConfig().catch(() => DEFAULT_SITE_CONFIG);
  const image = input.image || site.ogImage || null;
  const title = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  return {
    title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: typeof title === "string" ? `${title} — ${site.name}` : input.title,
      description: input.description,
      type: "website",
      url: input.path,
      siteName: site.name,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: typeof title === "string" ? `${title} — ${site.name}` : input.title,
      description: input.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function siteResponseTime(site: SiteConfig): string {
  return site.responseTime?.trim() || "1–2 business days";
}
