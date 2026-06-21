import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero, CTABanner } from "@/components/ui/Section";
import { PortfolioGallery } from "@/components/sections/PortfolioGallery";
import { getPageCopy, getPortfolioItems } from "@/lib/content";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Selected photography, videography, and creative direction work by ÉLEVÉ Visuals.",
};

function PortfolioContent({
  items,
  projectId,
}: {
  items: Awaited<ReturnType<typeof getPortfolioItems>>;
  projectId?: string;
}) {
  return <PortfolioGallery items={items} initialProjectId={projectId} />;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const [items, pageCopy] = await Promise.all([getPortfolioItems(), getPageCopy()]);

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        headline={pageCopy.portfolioHero.headline}
        subheadline={pageCopy.portfolioHero.subheadline}
        compact
      />
      <Suspense fallback={<div className="section-padding text-center text-fog">Loading...</div>}>
        <PortfolioContent items={items} projectId={params.project} />
      </Suspense>
      <CTABanner
        headline={pageCopy.portfolioCta.headline}
        subheadline={pageCopy.portfolioCta.subheadline}
        primaryLabel={pageCopy.portfolioCta.primaryLabel}
        primaryHref={pageCopy.portfolioCta.primaryHref}
      />
    </>
  );
}
