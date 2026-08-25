import "server-only";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/auth-secret";
import { prisma } from "@/lib/db";
import { hashIp, hashToken, isGalleryLive } from "@/lib/gallery/codes";

// Re-exported so callers have one import for gallery access, while the pure
// half stays testable on its own.
export {
  generateAccessCode,
  hashAccessCode,
  hashIp,
  hashToken,
  isGalleryLive,
  normalizeCode,
  verifyAccessCode,
} from "@/lib/gallery/codes";

/**
 * Client gallery access.
 *
 * Follows the purpose-scoped JWT pattern already used by booking-access-token
 * and session-upload-token, with two additions a photo gallery needs:
 *
 *   - the token is worthless on its own. It names a GalleryAccessSession row,
 *     and every request re-checks that row for revocation and expiry, so
 *     "revoke access" takes effect on the next request rather than whenever
 *     the token happens to expire.
 *   - the raw token is never stored. The row holds a SHA-256 of it, so a
 *     database leak cannot be replayed against a live gallery.
 */

const ISSUER = "eleve-gallery-access";
const AUDIENCE = "gallery-client";
const PURPOSE = "gallery-client-access";
const SESSION_DAYS = 30;

export const GALLERY_COOKIE_PREFIX = "eleve_gallery_";

/** Per-gallery cookie: one client device can hold sessions for several galleries. */
export function galleryCookieName(galleryId: string): string {
  return `${GALLERY_COOKIE_PREFIX}${galleryId}`;
}

export type GallerySessionClaims = {
  sessionId: string;
  galleryId: string;
  epoch: number;
};

async function signSessionToken(claims: GallerySessionClaims): Promise<string> {
  return new SignJWT({ ...claims, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getJwtSecretKey());
}

async function readSessionToken(token: string): Promise<GallerySessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (payload.purpose !== PURPOSE) return null;
    const { sessionId, galleryId, epoch } = payload as Record<string, unknown>;
    if (typeof sessionId !== "string" || typeof galleryId !== "string") return null;
    return { sessionId, galleryId, epoch: typeof epoch === "number" ? epoch : 0 };
  } catch {
    return null;
  }
}

/** Mint a session after the code has been checked. Sets the cookie as a side effect. */
export async function startGallerySession(
  gallery: { id: string; accessEpoch: number; expiresAt: Date | null },
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  // Never outlive the gallery itself.
  const horizon = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt =
    gallery.expiresAt && gallery.expiresAt < horizon ? gallery.expiresAt : horizon;

  const session = await prisma.galleryAccessSession.create({
    data: {
      galleryId: gallery.id,
      tokenHash: hashToken(raw),
      epoch: gallery.accessEpoch,
      ipHash: hashIp(meta.ip ?? ""),
      userAgent: (meta.userAgent ?? "").slice(0, 400),
      expiresAt,
    },
  });

  const token = await signSessionToken({
    sessionId: session.id,
    galleryId: gallery.id,
    epoch: gallery.accessEpoch,
  });

  const store = await cookies();
  store.set(galleryCookieName(gallery.id), `${session.id}.${raw}.${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session.id;
}

export type ResolvedGallerySession = {
  sessionId: string;
  galleryId: string;
};

/**
 * The single authorization check. Everything client-facing goes through this —
 * viewing, signed URLs, favourites, downloads — so there is one place where
 * revocation, expiry, epoch and gallery status are all enforced together.
 *
 * Returns null rather than throwing: callers decide between "show the gate"
 * and "404", and neither should leak which gallery ids exist.
 */
export async function resolveGallerySession(
  galleryId: string
): Promise<ResolvedGallerySession | null> {
  const store = await cookies();
  const cookie = store.get(galleryCookieName(galleryId))?.value;
  if (!cookie) return null;

  const [sessionId, raw, token] = cookie.split(".");
  if (!sessionId || !raw || !token) return null;

  const claims = await readSessionToken(token);
  if (!claims || claims.sessionId !== sessionId || claims.galleryId !== galleryId) return null;

  const session = await prisma.galleryAccessSession.findUnique({
    where: { id: sessionId },
    include: {
      gallery: {
        select: { id: true, status: true, accessEpoch: true, expiresAt: true },
      },
    },
  });
  if (!session || session.galleryId !== galleryId) return null;

  // Compare the presented secret against the stored digest in constant time.
  const presented = Buffer.from(hashToken(raw), "hex");
  const stored = Buffer.from(session.tokenHash, "hex");
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) return null;

  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  // Regenerating the code or revoking all access bumps the epoch, which kills
  // every outstanding session without touching a single session row.
  if (session.epoch !== session.gallery.accessEpoch) return null;
  if (!isGalleryLive(session.gallery)) return null;

  // Cheap liveness signal for the admin's "last opened"; never awaited.
  void prisma.galleryAccessSession
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return { sessionId, galleryId };
}

export async function endGallerySession(galleryId: string): Promise<void> {
  const store = await cookies();
  store.delete(galleryCookieName(galleryId));
}
