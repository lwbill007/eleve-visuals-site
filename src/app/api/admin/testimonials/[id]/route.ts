import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapTestimonial } from "@/lib/content";
import { revalidateHomepage } from "@/lib/revalidate-public";

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
    const item = await prisma.testimonial.update({
      where: { id },
      data: {
        quote: body.quote,
        name: body.name,
        role: body.role,
        featured: !!body.featured,
        sortOrder: body.sortOrder ?? 0,
        published: body.published !== false,
      },
    });

    revalidateHomepage();
    return NextResponse.json(mapTestimonial(item));
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
    await prisma.testimonial.delete({ where: { id } });
    revalidateHomepage();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
