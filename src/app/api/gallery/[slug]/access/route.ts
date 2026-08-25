import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isGalleryLive,
  startGallerySession,
  verifyAccessCode,
} from "@/lib/gallery/access";
import { recordGalleryEvent } from "@/lib/gallery/service";

const schema = z.object({ code: z.string().min(1).max(64) });

/**
 * The access gate.
 *
 * Every failure path returns the same message and the same status. A wrong
 * code, an unpublished gallery, an expired gallery and a slug that never
 * existed are indistinguishable from outside, so this endpoint cannot be used
 * to enumerate which galleries exist or which clients we shoot for.
 */
const DENIED = { error: "That code doesn't match this gallery." };

/**
 * A real bcrypt hash of a value no generated code can equal — generated codes
 * are drawn from a 31-character alphabet with no lowercase. Comparing against
 * this costs the same as comparing against a genuine hash.
 */
const DECOY_HASH = "$2b$10$Ux0F6PbnCe1kQyHqVmJ0kO0Qk2yZ1Q3Wl0dR9uYh6mS8pXv2c1sBK";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip, "gallery:code");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(DENIED, { status: 401 });

  const { slug } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      accessMode: true,
      accessCodeHash: true,
      accessEpoch: true,
      expiresAt: true,
    },
  });

  // Always run one bcrypt comparison, even with no gallery and no stored hash.
  // Returning early on a missing gallery would make "no such slug" measurably
  // faster than "wrong code" and hand out an enumeration oracle.
  const hash = gallery?.accessCodeHash || DECOY_HASH;
  const matches = await verifyAccessCode(parsed.data.code, hash);

  if (!gallery || !isGalleryLive(gallery) || gallery.accessMode !== "code" || !matches) {
    if (gallery) {
      recordGalleryEvent({ galleryId: gallery.id, type: "access_denied" });
    }
    return NextResponse.json(DENIED, { status: 401 });
  }

  const sessionId = await startGallerySession(gallery, {
    ip,
    userAgent: request.headers.get("user-agent") ?? "",
  });
  recordGalleryEvent({ galleryId: gallery.id, type: "access_granted", sessionId });

  return NextResponse.json({ ok: true });
}
