import type {
  PortfolioCategory,
  PortfolioItemDTO,
  ServiceDTO,
  ServiceEditorialSection,
  ServicesPageContent,
} from "./types";
import { resolvePortfolioCoverImage } from "./portfolio-utils";

const PORTFOLIO_MATCH: Record<string, PortfolioCategory[]> = {
  photography: ["Portraits", "Brands", "Athletes", "Events"],
  videography: ["Video", "BTS"],
  "creative-direction": ["Creative Direction", "Brands"],
};

export function pickPortfolioPreview(
  items: PortfolioItemDTO[],
  slug: string
): PortfolioItemDTO | null {
  const categories = PORTFOLIO_MATCH[slug] ?? [];
  for (const category of categories) {
    const match = items.find((item) => item.category === category);
    if (match) return match;
  }
  return items[0] ?? null;
}

export function mergeServiceSection(
  editorial: ServiceEditorialSection,
  cmsService?: ServiceDTO
): ServiceEditorialSection & {
  image: string | null;
  imageAlt: string;
  startingPrice: string | null;
} {
  return {
    ...editorial,
    description: cmsService?.description || editorial.description,
    image: cmsService?.image ?? null,
    imageAlt: cmsService?.imageAlt || `${editorial.eyebrow} by ÉLEVÉ Visuals`,
    startingPrice: cmsService?.startingPrice ?? null,
  };
}

export function resolveServicesHeroImage(
  pageContent: ServicesPageContent,
  services: ServiceDTO[],
  fallbackImage: string | null
): { image: string | null; imageAlt: string } {
  if (pageContent.hero.image) {
    return { image: pageContent.hero.image, imageAlt: pageContent.hero.imageAlt };
  }
  const serviceImage = services.find((s) => s.image)?.image;
  if (serviceImage) {
    return {
      image: serviceImage,
      imageAlt: services.find((s) => s.image)?.imageAlt || pageContent.hero.imageAlt,
    };
  }
  return { image: fallbackImage, imageAlt: pageContent.hero.imageAlt };
}

export function getPortfolioPreviewImage(item: PortfolioItemDTO): string | null {
  return resolvePortfolioCoverImage(item.image, item.gallery);
}
