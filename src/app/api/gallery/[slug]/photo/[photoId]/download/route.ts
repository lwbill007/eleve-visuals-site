import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signedReadUrl } from "@/lib/storage/r2";
import { authorizePhotoAccess, findGalleryBySlug, recordGalleryEvent } from "@/lib/gallery/service";

const tierSchema = z.enum(["display", "large", "original"]);

/**
 * One photo, one tier. Returns a short-lived signed URL rather than proxying
 * the bytes: the file leaves R2 for the client directly, so a 40 MB original
 * never occupies a serverless function or costs Vercel bandwidth.
 *
 * Authorization is entirely server-side. The client names a photo and a tier;
 * `authorizePhotoAccess` decides whether this session may have it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, "gallery:download");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many downloads. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const { slug, photoId } = await params;
  const tier = tierSchema.safeParse(new URL(request.url).searchParams.get("tier") ?? "large");
  if (!tier.success) return NextResponse.json({ error: "Not available" }, { status: 400 });

  const gallery = await findGalleryBySlug(slug);
  if (!gallery) return NextResponse.json({ error: "Not available" }, { status: 404 });

  const authorized = await authorizePhotoAccess(gallery.id, photoId, tier.data);
  if (!authorized) return NextResponse.json({ error: "Not available" }, { status: 404 });

  if (!gallery.downloadEnabled) {
    return NextResponse.json({ error: "Downloads are turned off for this gallery." }, { status: 403 });
  }

  // Originals get a much shorter window than previews: a link that leaks out of
  // a chat thread should already be dead.
  const ttl = tier.data === "original" ? 120 : 600;
  const url = await signedReadUrl(authorized.key, {
    expiresInSeconds: ttl,
    downloadFilename: authorized.filename,
  });

  recordGalleryEvent({
    galleryId: gallery.id,
    sessionId: authorized.sessionId,
    photoId,
    type: "download_started",
    meta: { tier: tier.data },
  });

  return NextResponse.redirect(url, { status: 302 });
}
