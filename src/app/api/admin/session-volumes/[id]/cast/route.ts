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
  const rows = await prisma.castMember.findMany({
    where: { volumeId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows.map(mapCastMember));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const volume = await prisma.sessionVolume.findUnique({ where: { id }, select: { id: true } });
  if (!volume) return NextResponse.json({ error: "Volume not found" }, { status: 404 });

  const body = await request.json();
  const data = parseCastBody(body);
  if (!data.fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const max = await prisma.castMember.aggregate({
    where: { volumeId: id },
    _max: { sortOrder: true },
  });

  const created = await prisma.castMember.create({
    data: { ...data, volumeId: id, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });

  await revalidateForVolume(id);
  return NextResponse.json(mapCastMember(created));
}

export async function PATCH(
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
  const order: string[] = Array.isArray(body.order) ? body.order : [];

  await prisma.$transaction(
    order.map((castId, index) =>
      prisma.castMember.update({
        where: { id: castId },
        data: { sortOrder: index },
      })
    )
  );

  await revalidateForVolume(id);
  return NextResponse.json({ ok: true });
}
