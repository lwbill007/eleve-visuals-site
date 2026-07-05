import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { normalizePortfolioGallery } from "@/lib/portfolio-utils";
import { linkMemories } from "./graph";
import { writeMemory } from "./store";
import { getWorkspaceId } from "./workspace";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syncCreativeMemory() {
  const workspaceId = getWorkspaceId();
  const period = monthKey();
  let synced = 0;
  const layers = new Set<string>(["creative"]);

  const [portfolio, analytics] = await Promise.all([
    prisma.portfolioItem.findMany({
      where: { published: true, archived: false },
      orderBy: [{ portfolioFeatured: "desc" }, { featured: "desc" }, { sortOrder: "asc" }],
      take: 16,
    }),
    getAnalyticsSummary(30),
  ]);

  const portfolioViews = new Map<string, number>();
  for (const page of analytics.topPages) {
    const match = page.path.match(/^\/portfolio\/([^/]+)/);
    if (match) portfolioViews.set(match[1], page.views);
  }

  let topMemoryId: string | null = null;
  let topViews = 0;

  for (const item of portfolio) {
    const gallery = normalizePortfolioGallery(JSON.parse(item.gallery || "[]"));
    const bts = normalizePortfolioGallery(JSON.parse(item.btsGallery || "[]"));
    const views = portfolioViews.get(item.slug) ?? 0;

    const mem = await writeMemory({
      workspaceId,
      layer: "creative",
      category: "project",
      key: item.slug,
      title: item.title,
      summary: `${item.category} · ${item.year}${views ? ` · ${views} pageviews` : ""}${item.creativeProcess ? " · process documented" : ""}`,
      value: {
        slug: item.slug,
        category: item.category,
        year: item.year,
        client: item.client,
        creativeProcess: item.creativeProcess.slice(0, 600),
        galleryCount: gallery.length,
        btsCount: bts.length,
        deliverables: JSON.parse(item.deliverables || "[]"),
        pageviews30d: views,
        featured: item.portfolioFeatured || item.featured,
        moodboard: bts.slice(0, 6),
      },
      confidence: views > 0 ? 0.92 : 0.8,
      importance: views > 50 ? 90 : item.portfolioFeatured ? 85 : 65,
      source: "sync",
      sourceRef: `portfolio:${item.id}`,
      tags: [item.category, item.year],
    });
    synced += 1;

    if (views > topViews) {
      topViews = views;
      topMemoryId = mem.id;
    }
  }

  if (topMemoryId && topViews > 0) {
    await writeMemory({
      workspaceId,
      layer: "creative",
      category: "performance",
      key: `top-project-${period}`,
      title: "Highest-traffic portfolio project",
      summary: `${topViews} pageviews in 30 days — prioritize in marketing and homepage placement`,
      value: { memoryId: topMemoryId, pageviews: topViews, period },
      confidence: 0.95,
      importance: 92,
      source: "sync",
      sourceRef: "analytics-portfolio",
    });
    synced += 1;
  }

  return { synced, layers: [...layers] };
}
