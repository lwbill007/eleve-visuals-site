import type { Prisma } from "@prisma/client";
import type { AspectRatio, PortfolioCredit, PortfolioItemDTO } from "@/lib/types";

export function resolvePortfolioCoverImage(
  image: string | null | undefined,
  gallery: string[] | undefined
): string | null {
  if (image) return image;
  return gallery?.[0] ?? null;
}

export function resolvePortfolioHeroImage(item: Pick<PortfolioItemDTO, "heroImage" | "image" | "gallery">): string | null {
  if (item.heroImage) return item.heroImage;
  return resolvePortfolioCoverImage(item.image, item.gallery);
}

export function normalizePortfolioGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function normalizePortfolioCredits(credits: unknown): PortfolioCredit[] {
  if (!Array.isArray(credits)) return [];
  return credits
    .map((item) => {
      if (typeof item === "string") {
        const [role, name] = item.split("|");
        return { role: role?.trim() || "", name: name?.trim() || "" };
      }
      if (item && typeof item === "object" && "role" in item && "name" in item) {
        return {
          role: String((item as PortfolioCredit).role || ""),
          name: String((item as PortfolioCredit).name || ""),
        };
      }
      return null;
    })
    .filter((item): item is PortfolioCredit => !!item?.role && !!item?.name);
}

export function normalizePortfolioImage(
  value: string | null | undefined,
  fallback: string | null
): string | null {
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return fallback;
}

export function normalizePortfolioInput(body: {
  image?: string | null;
  heroImage?: string | null;
  gallery?: unknown;
  btsGallery?: unknown;
}) {
  const gallery = normalizePortfolioGallery(body.gallery);
  const btsGallery = normalizePortfolioGallery(body.btsGallery);

  const image = "image" in body
    ? normalizePortfolioImage(body.image, null)
    : gallery[0] ?? null;

  const heroImage = "heroImage" in body
    ? normalizePortfolioImage(body.heroImage, null)
    : image;

  return { gallery, btsGallery, image, heroImage };
}

export function slugifyPortfolioTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return base || "project";
}

export function buildPortfolioData(body: Record<string, unknown>): Prisma.PortfolioItemCreateInput {
  const { gallery, btsGallery, image, heroImage } = normalizePortfolioInput({
    image: body.image as string | null | undefined,
    heroImage: body.heroImage as string | null | undefined,
    gallery: body.gallery,
    btsGallery: body.btsGallery,
  });

  return {
    title: String(body.title || ""),
    slug: String(body.slug || ""),
    subtitle: String(body.subtitle || ""),
    category: String(body.category || "Portraits"),
    client: body.client ? String(body.client) : null,
    year: String(body.year || new Date().getFullYear()),
    description: String(body.description || ""),
    creativeProcess: String(body.creativeProcess || ""),
    image,
    imageAlt: String(body.imageAlt || ""),
    heroImage,
    heroImageAlt: String(body.heroImageAlt || body.imageAlt || ""),
    aspectRatio: (body.aspectRatio as AspectRatio) || "landscape",
    featured: !!body.featured,
    portfolioFeatured: !!body.portfolioFeatured,
    archived: !!body.archived,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    gallery: JSON.stringify(gallery),
    btsGallery: JSON.stringify(btsGallery),
    videos: JSON.stringify(normalizePortfolioGallery(body.videos)),
    deliverables: JSON.stringify(
      Array.isArray(body.deliverables)
        ? body.deliverables.filter((d): d is string => typeof d === "string")
        : []
    ),
    credits: JSON.stringify(normalizePortfolioCredits(body.credits)),
    relatedServices: JSON.stringify(
      Array.isArray(body.relatedServices)
        ? body.relatedServices.filter((d): d is string => typeof d === "string")
        : []
    ),
    seoTitle: String(body.seoTitle || ""),
    seoDescription: String(body.seoDescription || ""),
    published: body.published !== false,
  };
}

export function mapPortfolioCredits(raw: string): PortfolioCredit[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizePortfolioCredits(parsed);
  } catch {
    return [];
  }
}

export function aspectRatioClass(aspectRatio: AspectRatio, wideSpan = false): string {
  switch (aspectRatio) {
    case "portrait":
      return "aspect-[3/4]";
    case "square":
      return "aspect-square";
    case "wide":
      return wideSpan ? "aspect-[21/9] lg:col-span-2" : "aspect-[16/9]";
    case "landscape":
    default:
      return "aspect-[4/3]";
  }
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export function youTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/.test(url);
}

export function vimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}
