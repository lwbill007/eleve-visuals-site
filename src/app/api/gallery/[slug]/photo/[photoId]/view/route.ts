import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signedReadUrl } from "@/lib/storage/r2";
import { authorizePhotoAccess, findGalleryBySlug, recordGalleryEvent } from "@/lib/gallery/service";

/**
 * A signed display URL for one photo, minted when the lightbox opens.
 *
 * Same authorization door as downloading: `authorizePhotoAccess` scoped by
 * galleryId, so a photo id from another gallery resolves to nothing here just
 * as it does everywhere else.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, "gallery:asset");
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const { slug, photoId } = await params;
  const gallery = await findGalleryBySlug(slug);
  if (!gallery) return NextResponse.json({ error: "Not available" }, { status: 404 });

  const authorized = await authorizePhotoAccess(gallery.id, photoId, "display");
  if (!authorized) return NextResponse.json({ error: "Not available" }, { status: 404 });

  recordGalleryEvent({
    galleryId: gallery.id,
    sessionId: authorized.sessionId,
    photoId,
    type: "photo_viewed",
  });

  return NextResponse.json({
    url: await signedReadUrl(authorized.key, { expiresInSeconds: 3600 }),
  });
}
