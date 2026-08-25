import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteKeys, isGalleryStorageConfigured } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Reconciliation for client galleries.
 *
 * Three things accumulate without it, none of them visible to anyone:
 *
 *   1. A browser closed mid-batch leaves GalleryPhoto rows stuck at "uploading"
 *      forever. They are invisible to the client (only "ready" is ever served)
 *      AND invisible to the admin, whose detail page lists only "failed" — so a
 *      lost upload was silently lost, which §11 of the brief forbids.
 *   2. The R2 object behind an abandoned upload is never referenced again.
 *   3. Expired temporary archives sit in the bucket being paid for.
 *
 * Deliberately conservative: it never deletes a photo row, only re-labels it so
 * a human can see it and retry. Only storage nothing references is removed.
 */

/** Generous — a 200MB original on a slow connection is a long upload. */
const STALE_UPLOAD_MS = 6 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_UPLOAD_MS);
  const now = new Date();

  // 1. Surface abandoned uploads instead of leaving them invisible.
  const stale = await prisma.galleryPhoto.updateMany({
    where: { status: "uploading", createdAt: { lt: cutoff } },
    data: {
      status: "failed",
      processingError: "Upload never completed. Re-upload this photograph.",
    },
  });

  // 2. Retire sessions that are past their own expiry.
  const sessions = await prisma.galleryAccessSession.updateMany({
    where: { revokedAt: null, expiresAt: { lt: now } },
    data: { revokedAt: now },
  });

  // 3. Reclaim expired archives — storage, then the row, so a storage failure
  //    leaves a row still pointing at the object rather than orphaning it.
  let archivesDeleted = 0;
  if (isGalleryStorageConfigured()) {
    const expired = await prisma.galleryArchive.findMany({
      where: { expiresAt: { lt: now }, status: { not: "expired" } },
      select: { id: true, storageKey: true },
      take: 100,
    });
    const keys = expired.map((a) => a.storageKey).filter(Boolean);
    if (keys.length) await deleteKeys(keys);
    if (expired.length) {
      await prisma.galleryArchive.updateMany({
        where: { id: { in: expired.map((a) => a.id) } },
        data: { status: "expired", storageKey: "" },
      });
      archivesDeleted = expired.length;
    }
  }

  // 4. Mark galleries whose expiry has passed, so the admin list and the
  //    client's experience agree about what "expired" means.
  const expiredGalleries = await prisma.gallery.updateMany({
    where: { status: "published", expiresAt: { lt: now } },
    data: { status: "expired" },
  });

  return NextResponse.json({
    ok: true,
    staleUploadsFlagged: stale.count,
    sessionsRetired: sessions.count,
    archivesReclaimed: archivesDeleted,
    galleriesExpired: expiredGalleries.count,
  });
}
