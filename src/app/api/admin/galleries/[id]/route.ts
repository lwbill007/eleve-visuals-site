import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAccessCode, hashAccessCode } from "@/lib/gallery/codes";
import { deletePrefix, galleryPrefix, galleryStorageUsage } from "@/lib/storage/r2";

const patchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  clientName: z.string().max(160).optional(),
  clientEmail: z.string().email().or(z.literal("")).optional(),
  sessionType: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  downloadEnabled: z.boolean().optional(),
  downloadQuality: z.enum(["web", "high"]).optional(),
  allowDownloadOriginals: z.boolean().optional(),
  favoriteEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  watermarkEnabled: z.boolean().optional(),
  /** Mints a new code and kills every existing client session. */
  regenerateCode: z.boolean().optional(),
  /** Kills every existing client session without changing the code. */
  revokeSessions: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMinimumRole("viewer");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      _count: { select: { favorites: true, comments: true, sessions: true } },
    },
  });
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  const [views, lastOpened, storage] = await Promise.all([
    prisma.galleryEvent.count({ where: { galleryId: id, type: "gallery_opened" } }),
    prisma.galleryEvent.findFirst({
      where: { galleryId: id, type: "gallery_opened" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    // Reported from the bucket, not summed from rows: a row can drift, the
    // bucket cannot. Falls back to unknown rather than inventing a number.
    galleryStorageUsage(id).catch(() => null),
  ]);

  const downloads = await prisma.galleryEvent.count({
    where: { galleryId: id, type: "download_started" },
  });

  return NextResponse.json({
    gallery: {
      ...gallery,
      // The hash is never sent to a browser, not even the admin's.
      accessCodeHash: undefined,
    },
    stats: {
      views,
      uniqueSessions: gallery._count.sessions,
      favorites: gallery._count.favorites,
      downloads,
      lastOpened: lastOpened?.createdAt ?? null,
      storage,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.gallery.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true, accessEpoch: true },
  });
  if (!existing) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  const { regenerateCode, revokeSessions, expiresAt, status, ...rest } = parsed.data;

  let newCode: string | undefined;
  const data: Record<string, unknown> = { ...rest };

  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (status) {
    data.status = status;
    if (status === "published" && !existing.publishedAt) data.publishedAt = new Date();
    if (status === "archived") data.archivedAt = new Date();
  }

  // One epoch bump covers both: every outstanding session carries the old epoch
  // and stops resolving on its very next request.
  if (regenerateCode) {
    newCode = generateAccessCode();
    data.accessCodeHash = await hashAccessCode(newCode);
    data.accessEpoch = existing.accessEpoch + 1;
  } else if (revokeSessions) {
    data.accessEpoch = existing.accessEpoch + 1;
  }

  const gallery = await prisma.gallery.update({ where: { id }, data });

  if (regenerateCode || revokeSessions) {
    await prisma.galleryAccessSession.updateMany({
      where: { galleryId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.galleryEvent.create({
      data: {
        galleryId: id,
        type: regenerateCode ? "code_regenerated" : "access_revoked",
        meta: "{}",
      },
    });
  }

  return NextResponse.json({
    gallery: { id: gallery.id, slug: gallery.slug, status: gallery.status },
    ...(newCode ? { accessCode: newCode } : {}),
  });
}

/**
 * Permanent deletion. Storage is emptied first: if that fails the row survives,
 * so the photographer still has a gallery pointing at the objects rather than a
 * bucket full of files nothing references.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMinimumRole("owner");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({ where: { id }, select: { id: true } });
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  try {
    const removed = await deletePrefix(galleryPrefix(id));
    // Cascades take the photos, sections, sessions, favourites and events.
    await prisma.gallery.delete({ where: { id } });
    return NextResponse.json({ ok: true, objectsDeleted: removed });
  } catch (error) {
    console.error(`[gallery] delete failed for ${id}:`, error);
    return NextResponse.json(
      { error: "Couldn't empty storage for this gallery. Nothing was deleted." },
      { status: 500 }
    );
  }
}
