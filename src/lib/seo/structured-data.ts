/**
 * Enterprise SEO structured data builders for ÉLEVÉ Visuals.
 * Never invents reviews or ratings — only emits what's measured/configured.
 */

import type { FaqItem, PortfolioItemDTO, SiteConfig, TestimonialDTO } from "@/lib/types";

function absoluteUrl(base: string, pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const root = base.replace(/\/$/, "");
  return `${root}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function buildOrganizationSchema(site: SiteConfig) {
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  return {
    "@context": "https://schema.org",
    "@type": ["PhotographyBusiness", "ProfessionalService", "LocalBusiness"],
    "@id": `${url}/#organization`,
    name: site.name,
    url,
    description: site.description || site.seoDescription,
    email: site.email,
    image: absoluteUrl(url, site.ogImage),
    logo: absoluteUrl(url, site.ogImage),
    sameAs: [site.instagramUrl].filter(Boolean),
    areaServed: site.location || "Northern California",
    priceRange: "$$–$$$$",
    founder: site.creator
      ? {
          "@type": "Person",
          name: site.creator,
        }
      : undefined,
  };
}

export function buildWebsiteSchema(site: SiteConfig) {
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: site.name,
    url,
    publisher: { "@id": `${url}/#organization` },
    potentialAction: {
      "@type": "ReserveAction",
      target: `${url}/book`,
      name: "Book Your Experience",
    },
  };
}

export function buildBreadcrumbSchema(
  site: SiteConfig,
  crumbs: { name: string; path: string }[]
) {
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${url}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

export function buildFaqSchema(faqs: FaqItem[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function buildReviewSchemas(site: SiteConfig, testimonials: TestimonialDTO[]) {
  if (!testimonials.length) return null;
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  return testimonials.slice(0, 8).map((t) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "PhotographyBusiness",
      name: site.name,
      "@id": `${url}/#organization`,
    },
    reviewBody: t.quote,
    author: {
      "@type": "Person",
      name: t.name,
    },
  }));
}

export function buildCreativeWorkSchema(site: SiteConfig, project: PortfolioItemDTO) {
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  const pageUrl = `${url}/portfolio/${project.slug}`;
  const images = [project.heroImage || project.image, ...(project.gallery || [])]
    .filter(Boolean)
    .slice(0, 12)
    .map((src) => absoluteUrl(url, src));

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": pageUrl,
    name: project.title,
    description: project.seoDescription || project.subtitle || project.description?.slice(0, 300),
    url: pageUrl,
    image: images,
    creator: {
      "@type": "Organization",
      "@id": `${url}/#organization`,
      name: site.name,
    },
    ...(project.client ? { about: project.client } : {}),
  };
}

export function buildImageObjectSchemas(site: SiteConfig, project: PortfolioItemDTO) {
  const url = site.url?.replace(/\/$/, "") || "https://elevevisuals.com";
  const sources = [project.heroImage || project.image, ...(project.gallery || [])].filter(
    Boolean
  ) as string[];
  return sources.slice(0, 8).map((src, i) => ({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: absoluteUrl(url, src),
    name: `${project.title} — image ${i + 1}`,
    description: project.imageAlt || project.title,
    creator: { "@type": "Organization", name: site.name },
  }));
}
