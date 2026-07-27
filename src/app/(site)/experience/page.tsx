import type { Metadata } from "next";
import { PageHero, CTABanner } from "@/components/ui/Section";
import { ExperienceTimeline } from "@/components/experience/ExperienceTimeline";
import { JsonLd } from "@/components/seo/JsonLd";
import { getExperienceContent, getPageCopy, getSiteConfig } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildBreadcrumbSchema } from "@/lib/seo/structured-data";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const experience = await getExperienceContent();
  return buildPageMetadata({
    title: "The Experience",
    description:
      experience.subheadline ||
      "Exactly what happens when you work with ÉLEVÉ — from inquiry to delivery, and beyond.",
    path: "/experience",
  });
}

export default async function ExperiencePage() {
  const [experience, pageCopy, site] = await Promise.all([
    getExperienceContent(),
    getPageCopy(),
    getSiteConfig(),
  ]);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(site, [
          { name: "Home", path: "/" },
          { name: "Experience", path: "/experience" },
        ])}
      />
      <PageHero eyebrow="The Experience" headline={experience.headline} subheadline={experience.subheadline} compact />

      <ExperienceTimeline stages={experience.stages} />

      <CTABanner
        headline={pageCopy.experienceCta.headline}
        subheadline={pageCopy.experienceCta.subheadline}
        primaryLabel={pageCopy.experienceCta.primaryLabel}
        primaryHref={pageCopy.experienceCta.primaryHref}
        secondaryLabel={pageCopy.experienceCta.secondaryLabel}
        secondaryHref={pageCopy.experienceCta.secondaryHref}
        analyticsLabel="experience_cta"
      />
    </>
  );
}
