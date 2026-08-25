import { NextResponse } from "next/server";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveVariants } from "@/lib/storage/image-pipeline";
import { getObjectBuffer, objectSize } from "@/lib/storage/r2";

// Sharp needs the Node runtime, and a large TIFF needs more than the default
// serverless window. 300s is the Vercel Pro ceiling for a Node function.
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Derive thumbnail/display/large for one uploaded original.
 *
 * Called by the browser once its direct-to-R2 PUT completes. Per-photo rather
 * than per-batch on purpose: one corrupt file fails one photo, the admin sees
 * exactly which, and a retry re-runs only that one.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: galleryId, photoId } = await params;
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: photoId, galleryId },
    select: { id: true, storageKeyOriginal: true },
  });
  if (!photo || !photo.storageKeyOriginal) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await prisma.galleryPhoto.update({
    where: { id: photo.id },
    data: { status: "processing", processingError: "" },
  });

  try {
    const original = await getObjectBuffer(photo.storageKeyOriginal);
    const derived = await deriveVariants(original, galleryId, photo.id);

    await prisma.galleryPhoto.update({
      where: { id: photo.id },
      data: {
        status: "ready",
        width: derived.width,
        height: derived.height,
        blurColor: derived.blurColor,
        storageKeyThumbnail: derived.keys.thumbnail,
        storageKeyDisplay: derived.keys.display,
        storageKeyLarge: derived.keys.large,
        size: await objectSize(photo.storageKeyOriginal).catch(() => 0),
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, photoId: photo.id, status: "ready" });
  } catch (error) {
    // The row is marked failed and kept. A lost upload the admin cannot see is
    // worse than a visible failure they can retry.
    const message = error instanceof Error ? error.message : "Processing failed";
    await prisma.galleryPhoto.update({
      where: { id: photo.id },
      data: { status: "failed", processingError: message.slice(0, 500) },
    });
    console.error(`[gallery] processing failed for ${photo.id}:`, error);
    return NextResponse.json(
      { error: "That photo couldn't be processed.", photoId: photo.id },
      { status: 500 }
    );
  }
}
