import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapService } from "@/lib/content";

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

  const item = await prisma.service.update({
    where: { id },
    data: {
      slug: body.slug,
      title: body.title,
      tagline: body.tagline,
      description: body.description,
      forWhom: body.forWhom,
      includes: JSON.stringify(body.includes || []),
      startingPrice: body.startingPrice,
      image: body.image,
      imageAlt: body.imageAlt,
      sortOrder: body.sortOrder ?? 0,
      published: body.published !== false,
    },
  });

  return NextResponse.json(mapService(item));
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
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
