import type { MetadataRoute } from "next";
import { discoverPlatformRoutes } from "@/lib/ai/memory/knowledge/route-discovery";
import { getSiteConfig } from "@/lib/content";

const STATIC_FALLBACK: MetadataRoute.Sitemap = [
  { url: "https://elevevisuals.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  { url: "https://elevevisuals.com/portfolio", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: "https://elevevisuals.com/services", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: "https://elevevisuals.com/sessions", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: "https://elevevisuals.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: "https://elevevisuals.com/contact", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: "https://elevevisuals.com/book", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [routes, site] = await Promise.all([
      discoverPlatformRoutes(),
      getSiteConfig().catch(() => null),
    ]);

    const base = site?.url?.replace(/\/$/, "") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://elevevisuals.com";
    const now = new Date();

    return routes
      .filter((r) => r.kind !== "admin" && !r.path.includes("["))
      .map((r) => ({
        url: `${base}${r.path === "/" ? "" : r.path}`,
        lastModified: now,
        changeFrequency: (r.kind === "dynamic" ? "weekly" : "monthly") as "weekly" | "monthly",
        priority: r.path === "/" ? 1 : r.path.startsWith("/sessions") ? 0.9 : 0.7,
      }));
  } catch (error) {
    console.error("[sitemap] Falling back to static routes — DB unavailable:", error);
    const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://elevevisuals.com";
    return STATIC_FALLBACK.map((entry) => ({
      ...entry,
      url: entry.url.replace("https://elevevisuals.com", base),
    }));
  }
}
