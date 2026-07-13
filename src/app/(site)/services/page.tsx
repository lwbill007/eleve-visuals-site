import type { Metadata } from "next";
import {
  getFeaturedPortfolio,
  getHeroContent,
  getPortfolioItems,
  getServices,
  getServicesPageContent,
  getSiteConfig,
} from "@/lib/content";
import { ServicesHero } from "@/components/services/ServicesHero";
import { ServiceEditorialSection } from "@/components/services/ServiceEditorialSection";
import { ServicesProcess } from "@/components/services/ServicesProcess";
import { ServicesFeaturedWork } from "@/components/services/ServicesFeaturedWork";
import { ServicesWhyEleve } from "@/components/services/ServicesWhyEleve";
import { ServicesClientExperience } from "@/components/services/ServicesClientExperience";
import { ServicesFaq } from "@/components/services/ServicesFaq";
import { ServicesFinalCta } from "@/components/services/ServicesFinalCta";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  mergeServiceSection,
  pickPortfolioPreview,
  resolveServicesHeroImage,
} from "@/lib/services-page";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/seo/structured-data";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getServicesPageContent();
  return buildPageMetadata({
    title: page.hero?.headline || "Services",
    description:
      page.hero?.subheadline ||
      "Premium photography, video production, and creative direction for brands, artists, athletes, and campaigns by ÉLEVÉ Visuals.",
    path: "/services",
    image: page.hero?.image,
  });
}

export default async function ServicesPage() {
  const [pageContent, services, portfolioItems, featuredWork, heroContent, site] =
    await Promise.all([
      getServicesPageContent(),
      getServices(),
      getPortfolioItems(),
      getFeaturedPortfolio(),
      getHeroContent(),
      getSiteConfig(),
    ]);

  const hero = resolveServicesHeroImage(pageContent, services, heroContent.image);
  const showcaseItems =
    featuredWork.length > 0 ? featuredWork : portfolioItems.slice(0, 4);

  const cmsBySlug = Object.fromEntries(services.map((s) => [s.slug, s]));

  const schemas = [
    buildBreadcrumbSchema(site, [
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
    ]),
    buildFaqSchema(pageContent.faq.items),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <>
      <JsonLd data={schemas} />
      <ServicesHero
        eyebrow={pageContent.hero.eyebrow}
        headline={pageContent.hero.headline}
        subheadline={pageContent.hero.subheadline}
        image={hero.image}
        imageAlt={hero.imageAlt}
        videoUrl={pageContent.hero.videoUrl}
      />

      <div>
        {pageContent.sections.map((section, index) => {
          const merged = mergeServiceSection(section, cmsBySlug[section.slug]);
          const featuredProject = pickPortfolioPreview(portfolioItems, section.slug);

          return (
            <ServiceEditorialSection
              key={section.slug}
              slug={merged.slug}
              eyebrow={merged.eyebrow}
              headline={merged.headline}
              description={merged.description}
              capabilities={merged.capabilities}
              ctaLabel={merged.ctaLabel}
              ctaHref={merged.ctaHref}
              image={merged.image}
              imageAlt={merged.imageAlt}
              startingPrice={merged.startingPrice}
              featuredProject={featuredProject}
              reversed={index % 2 === 1}
            />
          );
        })}
      </div>

      <ServicesProcess
        eyebrow={pageContent.process.eyebrow}
        headline={pageContent.process.headline}
        subheadline={pageContent.process.subheadline}
        steps={pageContent.process.steps}
      />

      <ServicesFeaturedWork
        eyebrow={pageContent.featuredWork.eyebrow}
        headline={pageContent.featuredWork.headline}
        subheadline={pageContent.featuredWork.subheadline}
        items={showcaseItems}
      />

      <ServicesWhyEleve
        eyebrow={pageContent.whyEleve.eyebrow}
        headline={pageContent.whyEleve.headline}
        items={pageContent.whyEleve.items}
      />

      <ServicesClientExperience
        eyebrow={pageContent.clientExperience.eyebrow}
        headline={pageContent.clientExperience.headline}
        subheadline={pageContent.clientExperience.subheadline}
        steps={pageContent.clientExperience.steps}
      />

      <ServicesFaq
        eyebrow={pageContent.faq.eyebrow}
        headline={pageContent.faq.headline}
        items={pageContent.faq.items}
      />

      <ServicesFinalCta
        headline={pageContent.finalCta.headline}
        subheadline={pageContent.finalCta.subheadline}
        primaryLabel={pageContent.finalCta.primaryLabel}
        primaryHref={pageContent.finalCta.primaryHref}
      />
    </>
  );
}
