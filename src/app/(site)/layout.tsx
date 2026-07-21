import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { StickyMobileBookCta } from "@/components/layout/StickyMobileBookCta";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ScrollDepthTracker } from "@/components/analytics/ScrollDepthTracker";
import { FunnelAnalyticsTracker } from "@/components/analytics/FunnelAnalyticsTracker";
import { BrandThemeStyles } from "@/components/admin/BrandThemeStyles";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteConfig, getNavigationConfig, getHomepageContent } from "@/lib/content";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/seo/structured-data";
import { unstable_cache } from "next/cache";
import {
  DEFAULT_HOMEPAGE,
  DEFAULT_NAVIGATION,
  DEFAULT_SITE_CONFIG,
} from "@/lib/defaults";

const getCachedSiteConfig = unstable_cache(
  async () => getSiteConfig().catch(() => DEFAULT_SITE_CONFIG),
  ["public-site-config-v1"],
  { revalidate: 300, tags: ["site-config"] }
);
const getCachedNavigation = unstable_cache(
  async () => getNavigationConfig().catch(() => DEFAULT_NAVIGATION),
  ["public-navigation-v1"],
  { revalidate: 300, tags: ["navigation"] }
);
const getCachedHomepage = unstable_cache(
  async () => getHomepageContent().catch(() => DEFAULT_HOMEPAGE),
  ["public-homepage-v1"],
  { revalidate: 300, tags: ["homepage"] }
);

export async function generateMetadata() {
  const siteConfig = await getCachedSiteConfig();
  const titleDefault =
    siteConfig.seoTitle || `${siteConfig.name} — Cinematic Visual Storytelling`;
  return {
    title: {
      default: titleDefault,
      template: `%s — ${siteConfig.name}`,
    },
    description: siteConfig.seoDescription || siteConfig.description,
    metadataBase: new URL(
      process.env.CANONICAL_SITE_URL || "https://www.eleve-visuals.com"
    ),
    keywords: [
      "photography",
      "videography",
      "creative direction",
      "Sacramento photographer",
      "Bay Area photographer",
      "brand content",
      "athlete photography",
      "ÉLEVÉ Visuals",
    ],
    openGraph: {
      title: siteConfig.name,
      description: siteConfig.description,
      type: "website",
      locale: "en_US",
      siteName: siteConfig.name,
      ...(siteConfig.ogImage ? { images: [{ url: siteConfig.ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: siteConfig.description,
      ...(siteConfig.ogImage ? { images: [siteConfig.ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [siteConfig, navigation, homepage] = await Promise.all([
    getCachedSiteConfig(),
    getCachedNavigation(),
    getCachedHomepage(),
  ]);

  return (
    <>
      <BrandThemeStyles colors={siteConfig.brandColors} />
      <JsonLd data={[buildOrganizationSchema(siteConfig), buildWebsiteSchema(siteConfig)]} />
      <GoogleAnalytics measurementId={siteConfig.googleAnalyticsId} />
      <ScrollDepthTracker />
      <FunnelAnalyticsTracker experimentVariant={homepage?.experiment?.variant} />
      <SkipToContent />
      <Header siteConfig={siteConfig} navLinks={navigation.navLinks} />
      <main id="main-content">{children}</main>
      <Footer siteConfig={siteConfig} navigation={navigation} />
      <StickyMobileBookCta />
    </>
  );
}
