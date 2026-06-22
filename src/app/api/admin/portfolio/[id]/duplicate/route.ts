import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapPortfolioItem } from "@/lib/content";
import { uniquePortfolioSlug } from "@/lib/portfolio";
import { revalidatePortfolioPages } from "@/lib/revalidate-public";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slug = await uniquePortfolioSlug(`${source.title} copy`);

  const item = await prisma.portfolioItem.create({
    data: {
      slug,
      title: `${source.title} (Copy)`,
      subtitle: source.subtitle,
      category: source.category,
      client: source.client,
      year: source.year,
      description: source.description,
      creativeProcess: source.creativeProcess,
      image: source.image,
      imageAlt: source.imageAlt,
      heroImage: source.heroImage,
      heroImageAlt: source.heroImageAlt,
      aspectRatio: source.aspectRatio,
      featured: false,
      portfolioFeatured: false,
      archived: false,
      sortOrder: source.sortOrder + 1,
      gallery: source.gallery,
      btsGallery: source.btsGallery,
      videos: source.videos,
      deliverables: source.deliverables,
      credits: source.credits,
      relatedServices: source.relatedServices,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      published: false,
    },
  });

  revalidatePortfolioPages();
  return NextResponse.json(mapPortfolioItem(item));
}
