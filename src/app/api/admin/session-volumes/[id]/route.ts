import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { parseSessionVolumeBody } from "@/lib/session-volume-admin";
import { validateFeaturedMediaId } from "@/lib/volume-videos";
import { revalidateSessionPages } from "@/lib/revalidate-public";

async function sanitizeFeaturedMediaId(
  data: ReturnType<typeof parseSessionVolumeBody>
): Promise<ReturnType<typeof parseSessionVolumeBody>> {
  const lists = {
    videos: JSON.parse(data.videos) as string[],
    interviews: JSON.parse(data.interviews) as string[],
    teaserVideoUrl: data.teaserVideoUrl,
  };
  const featuredMediaId = await validateFeaturedMediaId(data.featuredMediaId, lists);
  return { ...data, featuredMediaId };
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
  const parsed = parseSessionVolumeBody(body);
  const data = await sanitizeFeaturedMediaId(parsed);

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
