import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveGallerySession } from "@/lib/gallery/access";
import { findGalleryBySlug, recordGalleryEvent } from "@/lib/gallery/service";

const schema = z.object({ photoId: z.string().min(1).max(64), favorite: z.boolean() });

/** Toggle a favourite. Idempotent — a double tap or a retry cannot double-write. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, "gallery:favorite");
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { slug } = await params;
  const gallery = await findGalleryBySlug(slug);
  if (!gallery || !gallery.favoriteEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const session = await resolveGallerySession(gallery.id);
  if (!session) return NextResponse.json({ error: "Not available" }, { status: 401 });

  // Scoped by galleryId: a photo id from another gallery resolves to nothing.
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: parsed.data.photoId, galleryId: gallery.id, status: "ready" },
    select: { id: true },
  });
  if (!photo) return NextResponse.json({ error: "Not available" }, { status: 404 });

  if (parsed.data.favorite) {
    await prisma.galleryFavorite.upsert({
      where: { photoId_sessionId: { photoId: photo.id, sessionId: session.sessionId } },
      create: { galleryId: gallery.id, photoId: photo.id, sessionId: session.sessionId },
      update: {},
    });
  } else {
    await prisma.galleryFavorite
      .delete({
        where: { photoId_sessionId: { photoId: photo.id, sessionId: session.sessionId } },
      })
      .catch(() => {});
  }

  recordGalleryEvent({
    galleryId: gallery.id,
    sessionId: session.sessionId,
    photoId: photo.id,
    type: parsed.data.favorite ? "favorite_added" : "favorite_removed",
  });

  const count = await prisma.galleryFavorite.count({
    where: { galleryId: gallery.id, sessionId: session.sessionId },
  });
  return NextResponse.json({ ok: true, favorite: parsed.data.favorite, count });
}
