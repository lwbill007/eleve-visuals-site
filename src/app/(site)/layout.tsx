import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSiteConfig, getNavigationConfig } from "@/lib/content";

export async function generateMetadata() {
  const siteConfig = await getSiteConfig();
  return {
    title: {
      default: siteConfig.seoTitle || `${siteConfig.name} — Cinematic Visual Storytelling`,
      template: `%s — ${siteConfig.name}`,
    },
    description: siteConfig.seoDescription || siteConfig.description,
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
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [siteConfig, navigation] = await Promise.all([
    getSiteConfig(),
    getNavigationConfig(),
  ]);

  return (
    <>
      <Header siteConfig={siteConfig} navLinks={navigation.navLinks} />
      <main>{children}</main>
      <Footer siteConfig={siteConfig} navigation={navigation} />
    </>
  );
}
