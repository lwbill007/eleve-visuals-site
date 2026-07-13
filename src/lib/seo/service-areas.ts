/**
 * Service-area landing architecture (local SEO).
 * Add entries here — pages can be generated without refactoring core routing.
 * Do not invent rankings or review counts.
 */

export type ServiceAreaDefinition = {
  slug: string;
  name: string;
  region: string;
  /** Optional focus services for copy templates */
  services: string[];
  seoTitle?: string;
  seoDescription?: string;
};

/**
 * Seed areas for Northern California expansion.
 * Public routes can mount as `/locations/[slug]` in Phase 2.
 */
export const SERVICE_AREAS: ServiceAreaDefinition[] = [
  {
    slug: "northern-california",
    name: "Northern California",
    region: "CA",
    services: ["photography", "videography", "creative-direction"],
    seoTitle: "Photography & Video Production in Northern California",
    seoDescription:
      "Cinematic photography, video production, and creative direction for brands, athletes, and artists across Northern California.",
  },
  {
    slug: "sacramento",
    name: "Sacramento",
    region: "CA",
    services: ["photography", "videography"],
    seoTitle: "Sacramento Photography & Creative Direction",
    seoDescription:
      "ÉLEVÉ Visuals — cinematic portrait, brand, and campaign production for Sacramento and surrounding Northern California.",
  },
  {
    slug: "bay-area",
    name: "Bay Area",
    region: "CA",
    services: ["photography", "videography", "creative-direction"],
    seoTitle: "Bay Area Photography & Brand Films",
    seoDescription:
      "Premium visual storytelling for Bay Area founders, athletes, and creative brands — inquiry-first booking with ÉLEVÉ Visuals.",
  },
];

export function getServiceAreaBySlug(slug: string): ServiceAreaDefinition | undefined {
  return SERVICE_AREAS.find((a) => a.slug === slug);
}
