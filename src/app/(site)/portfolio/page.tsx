import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CTABanner } from "@/components/ui/Section";
import { PortfolioHero } from "@/components/portfolio/PortfolioHero";
import { PortfolioFeaturedProject } from "@/components/portfolio/PortfolioFeaturedProject";
import { PortfolioStats } from "@/components/portfolio/PortfolioStats";
import { PortfolioWorkGallery } from "@/components/portfolio/PortfolioWorkGallery";
import { getPageCopy, getPortfolioItemById, getPortfolioItems, getPortfolioPageContent } from "@/lib/content";
import { PORTFOLIO_CATEGORIES } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPortfolioPageContent();
  const { buildPageMetadata } = await import("@/lib/seo/page-metadata");
  return buildPageMetadata({
    title: page.hero.headline || "Portfolio",
    description: page.hero.description || page.hero.subheadline,
    path: "/portfolio",
  });
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  if (params.project) {
    const legacy = await getPortfolioItemById(params.project);
    if (legacy) redirect(`/portfolio/${legacy.slug}`);
  }

  // Single items query — derive featured + categories (avoid extra Prisma round-trips)
  const [items, pageContent, pageCopy] = await Promise.all([
    getPortfolioItems(),
    getPortfolioPageContent(),
    getPageCopy(),
  ]);

  const featured =
    items.find((i) => i.portfolioFeatured) ?? items.find((i) => i.featured) ?? null;
  const categories = Array.from(
    new Set([
      ...pageContent.categories,
      ...PORTFOLIO_CATEGORIES,
      ...items.map((i) => i.category).filter(Boolean),
    ])
  );

  return (
    <>
      <PortfolioHero content={pageContent.hero} />
      <PortfolioStats stats={pageContent.stats} />
      {featured && <PortfolioFeaturedProject project={featured} />}
      <PortfolioWorkGallery
        items={items}
        categories={categories}
        featuredSlug={featured?.slug}
        emptyState={pageContent.emptyState}
      />
      <CTABanner
        headline={pageCopy.portfolioCta.headline}
        subheadline={pageCopy.portfolioCta.subheadline}
        primaryLabel={pageCopy.portfolioCta.primaryLabel}
        primaryHref={pageCopy.portfolioCta.primaryHref}
      />
    </>
  );
}
