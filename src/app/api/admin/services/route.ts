import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapService } from "@/lib/content";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(items.map(mapService));
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const item = await prisma.service.create({
    data: {
      slug: body.slug,
      title: body.title,
      tagline: body.tagline,
      description: body.description,
      forWhom: body.forWhom,
      includes: JSON.stringify(body.includes || []),
      startingPrice: body.startingPrice,
      image: body.image || null,
      imageAlt: body.imageAlt || "",
      sortOrder: body.sortOrder ?? 0,
      published: body.published !== false,
    },
  });

  return NextResponse.json(mapService(item));
}
