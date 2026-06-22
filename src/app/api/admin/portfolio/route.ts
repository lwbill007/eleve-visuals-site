import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapPortfolioItem } from "@/lib/content";
import { buildPortfolioData } from "@/lib/portfolio-utils";
import { clearPortfolioFeaturedFlag, uniquePortfolioSlug } from "@/lib/portfolio";
import { revalidatePortfolioPages } from "@/lib/revalidate-public";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.portfolioItem.findMany({
    orderBy: [{ portfolioFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
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
  const slug = body.slug || (await uniquePortfolioSlug(body.title || "project"));
  const data = buildPortfolioData({ ...body, slug });

  if (data.portfolioFeatured) {
    await clearPortfolioFeaturedFlag();
  }

  const item = await prisma.portfolioItem.create({ data });

  revalidatePortfolioPages(item.slug);
  return NextResponse.json(mapPortfolioItem(item));
}
