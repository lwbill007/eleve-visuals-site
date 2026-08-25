import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage/image-pipeline";
import { isGalleryStorageConfigured, photoKey, signedUploadUrl } from "@/lib/storage/r2";

const schema = z.object({
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive(),
});

/**
 * Mint a direct-to-R2 upload URL for one original.
 *
 * The photo row is created first, in `uploading` state, so a browser that dies
 * mid-batch leaves a visible failed row rather than a silent gap. The signed
 * PUT is scoped to that row's exact key and content type.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGalleryStorageConfigured()) {
    return NextResponse.json(
      { error: "Cloudflare R2 is not configured. See docs/client-galleries.md." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const { filename, mimeType, size } = parsed.data;
  if (!ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `${mimeType} isn't a supported image format.` },
      { status: 415 }
    );
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit.` },
      { status: 413 }
    );
  }

  const { id: galleryId } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, sections: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  const last = await prisma.galleryPhoto.findFirst({
    where: { galleryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const ext = filename.includes(".") ? filename.split(".").pop()! : "jpg";
  const photo = await prisma.galleryPhoto.create({
    data: {
      galleryId,
      sectionId: gallery.sections[0]?.id ?? null,
      // Placeholder — rewritten below now that the row has an id.
      storageKeyOriginal: "",
      filename,
      mimeType,
      size,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      status: "uploading",
    },
  });

  const key = photoKey(galleryId, "originals", photo.id, ext);
  await prisma.galleryPhoto.update({ where: { id: photo.id }, data: { storageKeyOriginal: key } });

  return NextResponse.json({
    photoId: photo.id,
    uploadUrl: await signedUploadUrl(key, mimeType),
  });
}
