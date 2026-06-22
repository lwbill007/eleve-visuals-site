import {
  getHeroContent,
  getBrandStory,
  getFeaturedPortfolio,
  getFeaturedTestimonials,
  getHomeServices,
  getHomepageContent,
  getPageCopy,
  getSiteConfig,
} from "@/lib/content";
import { getFeaturedSessionVolume, getSessionVolumeById } from "@/lib/session-volumes";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { ServicesOverview } from "@/components/sections/ServicesOverview";
import { BrandStorySection } from "@/components/sections/BrandStory";
import { Testimonials } from "@/components/sections/Testimonials";
import { FeaturedSessionsHome } from "@/components/sections/FeaturedSessionsHome";
import { CTABanner } from "@/components/ui/Section";

export const revalidate = 60;

export default async function HomePage() {
  const [siteConfig, hero, homepage, featured, homeServices, brandStory, testimonials, pageCopy] =
    await Promise.all([
      getSiteConfig(),
      getHeroContent(),
      getHomepageContent(),
      getFeaturedPortfolio(),
      getHomeServices(),
      getBrandStory(),
      getFeaturedTestimonials(),
      getPageCopy(),
    ]);

  let featuredSession = null;
  if (homepage.featuredSessionVolumeId) {
    featuredSession = await getSessionVolumeById(homepage.featuredSessionVolumeId);
  }
  if (!featuredSession) {
    featuredSession = await getFeaturedSessionVolume();
  }

  const sectionMap: Record<string, React.ReactNode> = {
    "featured-work": <FeaturedWork key="featured-work" items={featured} />,
    services: <ServicesOverview key="services" services={homeServices} />,
    sessions: featuredSession ? (
      <FeaturedSessionsHome key="sessions" volume={featuredSession} />
    ) : null,
    "brand-story": <BrandStorySection key="brand-story" brandStory={brandStory} />,
    testimonials: <Testimonials key="testimonials" items={testimonials} />,
    cta: (
      <CTABanner
        key="cta"
        headline={pageCopy.homeCta.headline}
        subheadline={pageCopy.homeCta.subheadline}
        primaryLabel={pageCopy.homeCta.primaryLabel}
        primaryHref={pageCopy.homeCta.primaryHref}
        secondaryLabel={pageCopy.homeCta.secondaryLabel}
        secondaryHref={pageCopy.homeCta.secondaryHref}
      />
    ),
  };

  return (
    <>
      <HeroSection hero={hero} siteConfig={siteConfig} />
      {homepage.sections
        .filter((s) => s.enabled)
        .map((s) => sectionMap[s.id])
        .filter(Boolean)}
    </>
  );
}
