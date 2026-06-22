import { prisma } from "./db";
import { PORTFOLIO_CATEGORIES } from "./types";
import type { PortfolioItemDTO } from "./types";
import { getPortfolioPageContent, mapPortfolioItem } from "./content";
import { slugifyPortfolioTitle } from "./portfolio-utils";

export async function getPortfolioCategories(): Promise<string[]> {
  const page = await getPortfolioPageContent();
  const fromItems = await prisma.portfolioItem.findMany({
    where: { published: true, archived: false },
    select: { category: true },
    distinct: ["category"],
  });
  const merged = new Set([...page.categories, ...PORTFOLIO_CATEGORIES]);
  for (const item of fromItems) {
    if (item.category) merged.add(item.category);
  }
  return Array.from(merged);
}

export async function getPortfolioFeaturedProject(): Promise<PortfolioItemDTO | null> {
  const featured = await prisma.portfolioItem.findFirst({
    where: { published: true, archived: false, portfolioFeatured: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  if (featured) return mapPortfolioItem(featured);
  const fallback = await prisma.portfolioItem.findFirst({
    where: { published: true, archived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return fallback ? mapPortfolioItem(fallback) : null;
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItemDTO | null> {
  const item = await prisma.portfolioItem.findFirst({
    where: { slug, published: true, archived: false },
  });
  return item ? mapPortfolioItem(item) : null;
}

export async function getPortfolioAdjacent(slug: string): Promise<{
  prev: PortfolioItemDTO | null;
  next: PortfolioItemDTO | null;
}> {
  const items = await prisma.portfolioItem.findMany({
    where: { published: true, archived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const mapped = items.map(mapPortfolioItem);
  const index = mapped.findIndex((item) => item.slug === slug);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? mapped[index - 1] : null,
    next: index < mapped.length - 1 ? mapped[index + 1] : null,
  };
}

export async function uniquePortfolioSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugifyPortfolioTitle(title);
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.portfolioItem.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function clearPortfolioFeaturedFlag(excludeId?: string) {
  await prisma.portfolioItem.updateMany({
    where: {
      portfolioFeatured: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    data: { portfolioFeatured: false },
  });
}
