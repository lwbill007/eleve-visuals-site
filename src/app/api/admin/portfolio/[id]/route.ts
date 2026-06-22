import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapPortfolioItem } from "@/lib/content";
import { buildPortfolioData } from "@/lib/portfolio-utils";
import { clearPortfolioFeaturedFlag, uniquePortfolioSlug } from "@/lib/portfolio";
import { revalidatePortfolioPages } from "@/lib/revalidate-public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mapPortfolioItem(item));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.portfolioItem.findUnique({ where: { id } });
  const slug =
    body.slug ||
    (body.title ? await uniquePortfolioSlug(body.title, id) : existing?.slug) ||
    "project";
  const data = buildPortfolioData({ ...body, slug });

  if (data.portfolioFeatured) {
    await clearPortfolioFeaturedFlag(id);
  }

  try {
    const item = await prisma.portfolioItem.update({
      where: { id },
      data,
    });

    revalidatePortfolioPages(item.slug);
    return NextResponse.json(mapPortfolioItem(item));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const item = await prisma.portfolioItem.findUnique({ where: { id } });
    await prisma.portfolioItem.delete({ where: { id } });
    revalidatePortfolioPages(item?.slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
