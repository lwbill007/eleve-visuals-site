import {
  getHeroContent,
  getBrandStory,
  getFeaturedPortfolio,
  getFeaturedTestimonials,
  getHomeServices,
  getPageCopy,
  getSiteConfig,
} from "@/lib/content";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { ServicesOverview } from "@/components/sections/ServicesOverview";
import { BrandStorySection } from "@/components/sections/BrandStory";
import { Testimonials } from "@/components/sections/Testimonials";
import { CTABanner } from "@/components/ui/Section";

export const revalidate = 60;

export default async function HomePage() {
  const [siteConfig, hero, featured, homeServices, brandStory, testimonials, pageCopy] =
    await Promise.all([
      getSiteConfig(),
      getHeroContent(),
      getFeaturedPortfolio(),
      getHomeServices(),
      getBrandStory(),
      getFeaturedTestimonials(),
      getPageCopy(),
    ]);

  return (
    <>
      <HeroSection hero={hero} siteConfig={siteConfig} />
      <FeaturedWork items={featured} />
      <ServicesOverview services={homeServices} />
      <BrandStorySection brandStory={brandStory} />
      <Testimonials items={testimonials} />
      <CTABanner
        headline={pageCopy.homeCta.headline}
        subheadline={pageCopy.homeCta.subheadline}
        primaryLabel={pageCopy.homeCta.primaryLabel}
        primaryHref={pageCopy.homeCta.primaryHref}
        secondaryLabel={pageCopy.homeCta.secondaryLabel}
        secondaryHref={pageCopy.homeCta.secondaryHref}
      />
    </>
  );
}
