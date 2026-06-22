import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CTABanner } from "@/components/ui/Section";
import { PortfolioHero } from "@/components/portfolio/PortfolioHero";
import { PortfolioFeaturedProject } from "@/components/portfolio/PortfolioFeaturedProject";
import { PortfolioStats } from "@/components/portfolio/PortfolioStats";
import { PortfolioWorkGallery } from "@/components/portfolio/PortfolioWorkGallery";
import { getPageCopy, getPortfolioItemById, getPortfolioItems, getPortfolioPageContent } from "@/lib/content";
import { getPortfolioCategories, getPortfolioFeaturedProject } from "@/lib/portfolio";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPortfolioPageContent();
  return {
    title: page.hero.headline,
    description: page.hero.description || page.hero.subheadline,
  };
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

  const [items, pageContent, featured, categories, pageCopy] = await Promise.all([
    getPortfolioItems(),
    getPortfolioPageContent(),
    getPortfolioFeaturedProject(),
    getPortfolioCategories(),
    getPageCopy(),
  ]);

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
