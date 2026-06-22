import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapService } from "@/lib/content";
import { revalidateServicesPages } from "@/lib/revalidate-public";

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

  try {
    const item = await prisma.service.update({
      where: { id },
      data: {
        slug: body.slug,
        title: body.title,
        tagline: body.tagline,
        description: body.description,
        forWhom: body.forWhom,
        includes: JSON.stringify(body.includes || []),
        deliverables: JSON.stringify(body.deliverables || []),
        faqs: JSON.stringify(body.faqs || []),
        startingPrice: body.startingPrice,
        turnaround: body.turnaround || "",
        image: body.image,
        imageAlt: body.imageAlt,
        bannerImage: body.bannerImage ?? null,
        thumbnailImage: body.thumbnailImage ?? null,
        featured: !!body.featured,
        sortOrder: body.sortOrder ?? 0,
        published: body.published !== false,
        archived: !!body.archived,
      },
    });

    revalidateServicesPages();
    return NextResponse.json(mapService(item));
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
    await prisma.service.delete({ where: { id } });
    revalidateServicesPages();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
