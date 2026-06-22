import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { parseSessionVolumeBody } from "@/lib/session-volume-admin";
import { revalidateSessionPages } from "@/lib/revalidate-public";

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
  const item = await prisma.sessionVolume.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mapSessionVolume(item));
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
  const data = parseSessionVolumeBody(body);

  if (!data.title || !data.slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  try {
    if (data.featured) {
      await prisma.sessionVolume.updateMany({
        where: { id: { not: id } },
        data: { featured: false },
      });
    }

    const item = await prisma.sessionVolume.update({
      where: { id },
      data: {
        ...data,
        applicationDeadline:
          data.applicationDeadline === undefined ? undefined : data.applicationDeadline,
      },
    });

    revalidateSessionPages(data.slug);
    return NextResponse.json(mapSessionVolume(item));
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
    await prisma.sessionVolume.delete({ where: { id } });
    revalidateSessionPages();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
