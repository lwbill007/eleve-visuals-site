import type { MetadataRoute } from "next";
import { discoverPlatformRoutes } from "@/lib/ai/memory/knowledge/route-discovery";
import { getSiteConfig } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      changeFrequency: r.kind === "dynamic" ? "weekly" : "monthly",
      priority: r.path === "/" ? 1 : r.path.startsWith("/sessions") ? 0.9 : 0.7,
    }));
}
