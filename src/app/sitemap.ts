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

  const [portfolioResult, volumeResult, castResult] = await Promise.allSettled([
      prisma.portfolioItem.findMany({
        where: { published: true, archived: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.sessionVolume.findMany({
        where: { published: true, archived: false, status: { not: "draft" } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.castMember.findMany({
        where: {
          enableProfile: true,
          slug: { not: "" },
          status: { in: ["confirmed", "alumni"] },
          volume: {
            published: true,
            archived: false,
            status: { not: "draft" },
          },
        },
        select: { slug: true, updatedAt: true },
      }),
  ]);

  const portfolio = portfolioResult.status === "fulfilled" ? portfolioResult.value : [];
  const volumes = volumeResult.status === "fulfilled" ? volumeResult.value : [];
  const castRows = castResult.status === "fulfilled" ? castResult.value : [];
  for (const result of [portfolioResult, volumeResult, castResult]) {
    if (result.status === "rejected") {
      console.error("[sitemap] Dynamic source unavailable:", result.reason);
    }
  }
  const cast = new Map<string, Date>();
  for (const row of castRows) {
    const existing = cast.get(row.slug);
    if (!existing || row.updatedAt > existing) cast.set(row.slug, row.updatedAt);
  }

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
    ...[...cast.entries()].map(([slug, updatedAt]) => ({
        url: `${base}/sessions/cast/${slug}`,
        lastModified: updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];
}
