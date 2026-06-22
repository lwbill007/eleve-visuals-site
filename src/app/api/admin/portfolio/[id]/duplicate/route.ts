import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapPortfolioItem } from "@/lib/content";
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

  const item = await prisma.portfolioItem.create({
    data: {
      title: `${source.title} (Copy)`,
      category: source.category,
      client: source.client,
      year: source.year,
      description: source.description,
      image: source.image,
      imageAlt: source.imageAlt,
      aspectRatio: source.aspectRatio,
      featured: false,
      archived: false,
      sortOrder: source.sortOrder + 1,
      gallery: source.gallery,
      published: false,
    },
  });

  revalidatePortfolioPages();
  return NextResponse.json(mapPortfolioItem(item));
}
