import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapPortfolioItem } from "@/lib/content";
import { normalizePortfolioInput } from "@/lib/portfolio-utils";
import { revalidatePortfolioPages } from "@/lib/revalidate-public";
import type { AspectRatio, PortfolioCategory } from "@/lib/types";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.portfolioItem.findMany({
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(items.map(mapPortfolioItem));
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { image, gallery } = normalizePortfolioInput(body);

  const item = await prisma.portfolioItem.create({
    data: {
      title: body.title,
      category: body.category as PortfolioCategory,
      client: body.client || null,
      year: body.year || new Date().getFullYear().toString(),
      description: body.description || "",
      image,
      imageAlt: body.imageAlt || "",
      aspectRatio: (body.aspectRatio as AspectRatio) || "landscape",
      featured: !!body.featured,
      sortOrder: body.sortOrder ?? 0,
      gallery: JSON.stringify(gallery),
      published: body.published !== false,
    },
  });

  revalidatePortfolioPages();
  return NextResponse.json(mapPortfolioItem(item));
}
