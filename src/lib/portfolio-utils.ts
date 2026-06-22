export function resolvePortfolioCoverImage(
  image: string | null | undefined,
  gallery: string[] | undefined
): string | null {
  if (image) return image;
  return gallery?.[0] ?? null;
}

export function normalizePortfolioGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function normalizePortfolioInput(body: {
  image?: string | null;
  gallery?: unknown;
}) {
  const gallery = normalizePortfolioGallery(body.gallery);
  const image = body.image || gallery[0] || null;
  return { gallery, image };
}
