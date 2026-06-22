import {
  getBrandStory,
  getFeaturedPortfolio,
  getFeaturedTestimonials,
  getHeroContent,
  getHomepageContent,
  getServices,
} from "@/lib/content";
import { getFeaturedSessionVolume, getSessionVolumeById } from "@/lib/session-volumes";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeFeaturedWork } from "@/components/home/HomeFeaturedWork";
import { HomeServicesPreview } from "@/components/home/HomeServicesPreview";
import { HomeSessionsPreview } from "@/components/home/HomeSessionsPreview";
import { HomeWhyEleve } from "@/components/home/HomeWhyEleve";
import { HomeProcessTimeline } from "@/components/home/HomeProcessTimeline";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";

export const revalidate = 60;

export default async function HomePage() {
  const [hero, homepage, featured, services, brandStory, testimonials] = await Promise.all([
    getHeroContent(),
    getHomepageContent(),
    getFeaturedPortfolio(),
    getServices(true),
    getBrandStory(),
    getFeaturedTestimonials(),
  ]);

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
        items={featured}
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
        steps={homepage.processSteps}
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

  return (
    <>
      <HomeHero hero={hero} />
      {homepage.sections
        .filter((s) => s.enabled)
        .map((s) => sectionMap[s.id])
        .filter(Boolean)}
    </>
  );
}
