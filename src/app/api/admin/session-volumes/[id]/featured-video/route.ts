import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { enrichSessionVolume } from "@/lib/session-volumes";
import { validateFeaturedMediaId } from "@/lib/volume-videos";
import { revalidateSessionPages } from "@/lib/revalidate-public";

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
  const mediaId =
    body.mediaId === null || body.mediaId === undefined
      ? null
      : String(body.mediaId).trim() || null;

  const item = await prisma.sessionVolume.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const volume = mapSessionVolume(item);
  const featuredMediaId = await validateFeaturedMediaId(mediaId, {
    videos: volume.videos,
    interviews: volume.interviews,
    teaserVideoUrl: volume.teaserVideoUrl,
  });

  if (mediaId && !featuredMediaId) {
    return NextResponse.json({ error: "Video must belong to this Volume" }, { status: 400 });
  }

  const updated = await prisma.sessionVolume.update({
    where: { id },
    data: { featuredMediaId },
  });

  revalidateSessionPages(volume.slug);
  return NextResponse.json(await enrichSessionVolume(mapSessionVolume(updated)));
}
