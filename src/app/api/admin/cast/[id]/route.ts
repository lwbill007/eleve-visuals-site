import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapCastMember, parseCastBody } from "@/lib/cast";
import { revalidateSessionPages } from "@/lib/revalidate-public";

async function revalidateForVolume(volumeId: string) {
  const volume = await prisma.sessionVolume.findUnique({
    where: { id: volumeId },
    select: { slug: true },
  });
  revalidateSessionPages(volume?.slug);
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
  const data = parseCastBody(body);
  if (!data.fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  try {
    const updated = await prisma.castMember.update({
      where: { id },
      data,
    });
    await revalidateForVolume(updated.volumeId);
    return NextResponse.json(mapCastMember(updated));
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
    const deleted = await prisma.castMember.delete({ where: { id } });
    await revalidateForVolume(deleted.volumeId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
