import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapTestimonial } from "@/lib/content";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(items.map(mapTestimonial));
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const item = await prisma.testimonial.create({
    data: {
      quote: body.quote,
      name: body.name,
      role: body.role,
      featured: !!body.featured,
      sortOrder: body.sortOrder ?? 0,
      published: body.published !== false,
    },
  });

  return NextResponse.json(mapTestimonial(item));
}
