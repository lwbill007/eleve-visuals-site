import "server-only";
import { prisma } from "@/lib/db";
import { signedReadUrl } from "@/lib/storage/r2";
import { resolveGallerySession } from "@/lib/gallery/access";

/**
 * Every read a client is allowed to perform.
 *
 * The rule this file exists to enforce: a photo is only ever fetched together
 * with the gallery it belongs to. There is no `findUnique({ where: { id } })`
 * on a photo anywhere in the client-facing code, so knowing a photo id buys
 * nothing without a session for that photo's gallery (brief §23, IDOR).
 */

export type ClientPhoto = {
  id: string;
  filename: string;
  caption: string;
  width: number;
  height: number;
  blurColor: string;
  sectionId: string | null;
  thumbnailUrl: string;
  displayUrl: string;
  isFavorite: boolean;
};

export type ClientSection = { id: string; title: string; count: number };

export type ClientGallery = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sessionType: string;
  clientName: string;
  photoCount: number;
  favoriteCount: number;
  downloadEnabled: boolean;
  downloadQuality: string;
  allowDownloadOriginals: boolean;
  favoriteEnabled: boolean;
  commentsEnabled: boolean;
  expiresAt: Date | null;
  sections: ClientSection[];
  photos: ClientPhoto[];
};

/** Signed URLs live slightly longer than a page is likely to be open. */
const VIEW_URL_TTL = 60 * 60;

export async function findGalleryBySlug(slug: string) {
  return prisma.gallery.findUnique({ where: { slug } });
}

/**
 * Load a gallery for a client who has already cleared the gate.
 *
 * Returns null when the session does not resolve, so a caller cannot
 * accidentally render photos by forgetting to check first.
 */
export async function loadClientGallery(
  galleryId: string,
  opts: { sectionId?: string | null; favoritesOnly?: boolean } = {}
): Promise<ClientGallery | null> {
  const session = await resolveGallerySession(galleryId);
  if (!session) return null;

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!gallery) return null;

  const favorites = await prisma.galleryFavorite.findMany({
    where: { galleryId, sessionId: session.sessionId },
    select: { photoId: true },
  });
  const favoriteIds = new Set(favorites.map((f) => f.photoId));

  const photos = await prisma.galleryPhoto.findMany({
    where: {
      galleryId,
      status: "ready",
      ...(opts.sectionId ? { sectionId: opts.sectionId } : {}),
      ...(opts.favoritesOnly ? { id: { in: [...favoriteIds] } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const counts = await prisma.galleryPhoto.groupBy({
    by: ["sectionId"],
    where: { galleryId, status: "ready" },
    _count: { _all: true },
  });
  const bySection = new Map(counts.map((c) => [c.sectionId, c._count._all]));

  // Signing is per-object and parallel; a 200-photo gallery is one round of
  // local HMAC work, not 200 network calls.
  const resolved = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      filename: photo.filename,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      blurColor: photo.blurColor,
      sectionId: photo.sectionId,
      thumbnailUrl: photo.storageKeyThumbnail
        ? await signedReadUrl(photo.storageKeyThumbnail, { expiresInSeconds: VIEW_URL_TTL })
        : "",
      displayUrl: photo.storageKeyDisplay
        ? await signedReadUrl(photo.storageKeyDisplay, { expiresInSeconds: VIEW_URL_TTL })
        : "",
      isFavorite: favoriteIds.has(photo.id),
    }))
  );

  return {
    id: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    description: gallery.description,
    sessionType: gallery.sessionType,
    clientName: gallery.clientName,
    photoCount: photos.length,
    favoriteCount: favoriteIds.size,
    downloadEnabled: gallery.downloadEnabled,
    downloadQuality: gallery.downloadQuality,
    allowDownloadOriginals: gallery.allowDownloadOriginals,
    favoriteEnabled: gallery.favoriteEnabled,
    commentsEnabled: gallery.commentsEnabled,
    expiresAt: gallery.expiresAt,
    sections: gallery.sections.map((s) => ({
      id: s.id,
      title: s.title,
      count: bySection.get(s.id) ?? 0,
    })),
    photos: resolved,
  };
}

/**
 * Authorize one photo against one gallery session and return the storage key
 * for the requested tier. The single door for every byte a client downloads.
 */
export async function authorizePhotoAccess(
  galleryId: string,
  photoId: string,
  tier: "thumbnail" | "display" | "large" | "original"
): Promise<{ key: string; filename: string; sessionId: string } | null> {
  const session = await resolveGallerySession(galleryId);
  if (!session) return null;

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: {
      downloadEnabled: true,
      downloadQuality: true,
      allowDownloadOriginals: true,
    },
  });
  if (!gallery) return null;

  // A download tier the gallery does not permit is refused even though the
  // session is valid — the client controls the request, never the permission.
  if (tier === "original" && !gallery.allowDownloadOriginals) return null;
  if (tier === "large" && gallery.downloadQuality !== "high") return null;

  // Scoped by galleryId, not just id: this is the IDOR guard.
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: photoId, galleryId, status: "ready" },
    select: {
      filename: true,
      storageKeyOriginal: true,
      storageKeyLarge: true,
      storageKeyDisplay: true,
      storageKeyThumbnail: true,
    },
  });
  if (!photo) return null;

  const key =
    tier === "original"
      ? photo.storageKeyOriginal
      : tier === "large"
        ? photo.storageKeyLarge
        : tier === "display"
          ? photo.storageKeyDisplay
          : photo.storageKeyThumbnail;
  if (!key) return null;

  return { key, filename: photo.filename, sessionId: session.sessionId };
}

/** Fire-and-forget activity. Never blocks a client response. */
export function recordGalleryEvent(input: {
  galleryId: string;
  type: string;
  sessionId?: string | null;
  photoId?: string | null;
  meta?: Record<string, unknown>;
}): void {
  void prisma.galleryEvent
    .create({
      data: {
        galleryId: input.galleryId,
        type: input.type,
        sessionId: input.sessionId ?? null,
        photoId: input.photoId ?? null,
        meta: JSON.stringify(input.meta ?? {}),
      },
    })
    .catch(() => {});
}

/** Slug from a title, collision-proofed against existing galleries. */
export async function uniqueGallerySlug(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "gallery";

  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const clash = await prisma.gallery.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}
