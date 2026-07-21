import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.CANONICAL_SITE_URL?.replace(/\/$/, "") ??
    "https://www.eleve-visuals.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/portfolio`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/sessions`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/book`, changeFrequency: "monthly", priority: 0.95 },
    { url: `${base}/alumni`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/booking-terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [portfolio, volumes, cast] = await Promise.all([
      prisma.portfolioItem.findMany({
        where: { published: true, archived: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.sessionVolume.findMany({
        where: { published: true, status: { not: "draft" } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.castMember.findMany({
        where: { enableProfile: true, slug: { not: "" } },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...portfolio.map((p) => ({
        url: `${base}/portfolio/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...volumes.map((v) => ({
        url: `${base}/sessions/${v.slug}`,
        lastModified: v.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      })),
      ...cast.map((c) => ({
        url: `${base}/sessions/cast/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] Falling back to static routes:", error);
    return staticRoutes;
  }
}
