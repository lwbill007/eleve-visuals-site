import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { enrichSessionVolume } from "@/lib/session-volumes";
import { revalidateSessionPages } from "@/lib/revalidate-public";

function parseJsonArrayFromDb(raw: string | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export async function DELETE(
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
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const item = await prisma.sessionVolume.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const videos = parseJsonArrayFromDb(item.videos).filter((v) => v !== url);
  const interviews = parseJsonArrayFromDb(item.interviews).filter((v) => v !== url);
  const teaserVideoUrl = item.teaserVideoUrl?.trim() === url ? null : item.teaserVideoUrl;

  let featuredMediaId = item.featuredMediaId;
  if (featuredMediaId) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: featuredMediaId } });
    if (asset?.url === url) featuredMediaId = null;
  }

  const updated = await prisma.sessionVolume.update({
    where: { id },
    data: {
      videos: JSON.stringify(videos),
      interviews: JSON.stringify(interviews),
      teaserVideoUrl,
      featuredMediaId,
    },
  });

  revalidateSessionPages(item.slug);
  return NextResponse.json(await enrichSessionVolume(mapSessionVolume(updated)));
}
