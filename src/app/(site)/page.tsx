import type { Metadata } from "next";
import {
  getAboutContent,
  getBrandStory,
  getFeaturedPortfolio,
  getFeaturedTestimonials,
  getHeroContent,
  getHomepageContent,
  getPortfolioItemById,
  getServices,
  getSiteConfig,
} from "@/lib/content";
import { getFeaturedSessionVolume, getSessionVolumeById } from "@/lib/session-volumes";
import { HomeAnnouncementBanner } from "@/components/home/HomeAnnouncementBanner";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTrustBar } from "@/components/home/HomeTrustBar";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeFeaturedWork } from "@/components/home/HomeFeaturedWork";
import { HomeServicesPreview } from "@/components/home/HomeServicesPreview";
import { HomeSessionsPreview } from "@/components/home/HomeSessionsPreview";
import { HomeFounderIntro } from "@/components/home/HomeFounderIntro";
import { HomeWhyEleve } from "@/components/home/HomeWhyEleve";
import { HomeProcessTimeline } from "@/components/home/HomeProcessTimeline";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildReviewSchemas } from "@/lib/seo/structured-data";
import { siteResponseTime } from "@/lib/seo/page-metadata";
import { getPublicSeasonalState } from "@/lib/seasonal/server";
import { SeasonalHero } from "@/components/seasonal/SeasonalHero";
import { SeasonalExperience } from "@/components/seasonal/SeasonalExperience";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [site, hero] = await Promise.all([getSiteConfig(), getHeroContent()]);
  const title = site.seoTitle || `${site.name} — Cinematic Visual Storytelling`;
  const description =
    site.seoDescription ||
    hero.subheadline ||
    site.description ||
    "Photography, motion, and creative direction for brands, athletes, and artists.";

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/",
      ...(site.ogImage || hero.image
        ? { images: [{ url: site.ogImage || hero.image! }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(site.ogImage || hero.image
        ? { images: [site.ogImage || hero.image!] }
        : {}),
    },
  };
}

function orderedSections(sections: { id: string; enabled: boolean }[]) {
  return sections.filter((section) => section.enabled);
}

export default async function HomePage() {
  const [hero, homepage, featured, services, brandStory, testimonials, site, about, seasonal] =
    await Promise.all([
      getHeroContent(),
      getHomepageContent(),
      getFeaturedPortfolio(),
      getServices(true),
      getBrandStory(),
      getFeaturedTestimonials(),
      getSiteConfig(),
      getAboutContent(),
      getPublicSeasonalState(),
    ]);
  // Seasonal overlay: null in Default ÉLEVÉ, so the original homepage renders unchanged.
  const campaign = seasonal.campaign;
  // With the campaign hero, the announcement renders inside the hero (clear of the
  // fixed header) and the default banner is hidden; otherwise use the banner slot.
  const banner = campaign?.sections.hero
    ? null
    : campaign?.announcement.enabled && campaign.announcement.text.trim()
      ? { enabled: true, text: campaign.announcement.text, href: campaign.announcement.href, image: null }
      : homepage.banner;

  let featuredWork = featured;
  if (homepage.featuredPortfolioItemId) {
    const pinned = await getPortfolioItemById(homepage.featuredPortfolioItemId);
    if (pinned) {
      featuredWork = [pinned, ...featured.filter((f) => f.id !== pinned.id)].slice(0, 8);
    }
  }

  let featuredSession = null;
  if (homepage.featuredSessionVolumeId) {
    featuredSession = await getSessionVolumeById(homepage.featuredSessionVolumeId);
  }
  if (!featuredSession) {
    featuredSession = await getFeaturedSessionVolume();
  }

  const sectionMap: Record<string, React.ReactNode> = {
    stats: (
      <HomeStats
        key="stats"
        enabled={homepage.stats.enabled}
        items={homepage.stats.items}
      />
    ),
    "featured-work": (
      <HomeFeaturedWork
        key="featured-work"
        items={featuredWork}
        copy={homepage.copy.featuredWork}
        filters={homepage.workFilters}
      />
    ),
    services: (
      <HomeServicesPreview
        key="services"
        services={services}
        copy={homepage.copy.services}
      />
    ),
    sessions: featuredSession ? (
      <HomeSessionsPreview
        key="sessions"
        volume={featuredSession}
        copy={homepage.copy.sessions}
      />
    ) : null,
    founder: <HomeFounderIntro key="founder" about={about} />,
    "brand-story": (
      <HomeWhyEleve
        key="brand-story"
        brandStory={brandStory}
        copy={homepage.copy.whyEleve}
        pillars={homepage.whyPillars}
      />
    ),
    process: (
      <HomeProcessTimeline
        key="process"
        copy={homepage.copy.process}
        steps={homepage.processSteps.slice(0, 4)}
        moreHref="/experience"
        moreLabel="See the full experience →"
      />
    ),
    testimonials: (
      <HomeTestimonials
        key="testimonials"
        items={testimonials}
        copy={homepage.copy.testimonials}
      />
    ),
    cta: <HomeFinalCta key="cta" copy={homepage.copy.cta} />,
  };

  const reviews = buildReviewSchemas(site, testimonials);

  const responseTime = siteResponseTime(site);

  return (
    <>
      {reviews ? <JsonLd data={reviews} /> : null}
      <HomeAnnouncementBanner banner={banner} />
      {campaign?.sections.hero ? (
        <SeasonalHero campaign={campaign} placement="home" showAnnouncement />
      ) : (
        <HomeHero hero={hero} experimentId={homepage.experiment?.id} />
      )}
      {campaign?.sections.experience ? (
        <SeasonalExperience campaign={campaign} placement="home" />
      ) : null}
      <HomeTrustBar
        testimonials={testimonials}
        content={homepage.trustBar}
        responseTime={responseTime}
      />
      {orderedSections(homepage.sections)
        .map((s) => sectionMap[s.id])
        .filter(Boolean)}
    </>
  );
}
