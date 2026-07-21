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

// Public content is database-backed. Resolve it at request time so a temporary
// database outage cannot make the entire Vercel deployment fail at prerender.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const siteConfig = await getSiteConfig();
  const titleDefault =
    siteConfig.seoTitle || `${siteConfig.name} — Cinematic Visual Storytelling`;
  return {
    title: {
      default: titleDefault,
      template: `%s — ${siteConfig.name}`,
    },
    description: siteConfig.seoDescription || siteConfig.description,
    metadataBase: new URL(
      siteConfig.url || process.env.NEXT_PUBLIC_SITE_URL || "https://elevevisuals.com"
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
    getSiteConfig(),
    getNavigationConfig(),
    getHomepageContent().catch(() => null),
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
