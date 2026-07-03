import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { inferMimeType } from "@/lib/image-url";
import {
  blobFolderForMime,
  isAllowedUploadMime,
  localSubdirForMime,
  maxBytesForMime,
  maxLabelForMime,
  VERCEL_SERVER_MAX_BYTES,
} from "@/lib/upload-constants";
import {
  putPublicBlob,
  sanitizeUploadFilename,
  saveLocalUpload,
} from "@/lib/upload-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = inferMimeType(file);

  console.log("[upload-api] received", {
    name: file.name,
    type: mimeType,
    reportedType: file.type,
    size: file.size,
  });

  if (!isAllowedUploadMime(mimeType)) {
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      return NextResponse.json(
        {
          error:
            "HEIC photos are not supported. Export as JPEG or PNG, or on iPhone use Settings → Camera → Most Compatible.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, WAV, M4A, AAC, OGG, FLAC, PDF" },
      { status: 400 }
    );
  }

  const maxSize = maxBytesForMime(mimeType);
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (max ${maxLabelForMime(mimeType)})` },
      { status: 400 }
    );
  }

  if (process.env.VERCEL && file.size > VERCEL_SERVER_MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "File exceeds Vercel's 4.5MB server upload limit. The admin UI should upload directly to Blob — refresh and try again.",
      },
      { status: 413 }
    );
  }

  const filename = sanitizeUploadFilename(file.name, mimeType);
  const buffer = Buffer.from(await file.arrayBuffer());
  const blobPath = `${blobFolderForMime(mimeType)}/${filename}`;

  try {
    const blobUrl = await putPublicBlob(blobPath, buffer, mimeType);

    if (blobUrl) {
      try {
        await prisma.mediaAsset.upsert({
          where: { url: blobUrl },
          create: { url: blobUrl, filename: file.name },
          update: { filename: file.name },
        });
      } catch (dbError) {
        console.error("[upload-api] media index failed:", dbError);
      }

      console.log("[upload-api] success", { url: blobUrl });
      return NextResponse.json({ url: blobUrl });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Blob storage is not configured. In Vercel → Storage, create a Public Blob store, connect it to this project, then redeploy.",
        },
        { status: 500 }
      );
    }

    const localUrl = await saveLocalUpload(localSubdirForMime(mimeType), filename, buffer);

    try {
      await prisma.mediaAsset.upsert({
        where: { url: localUrl },
        create: { url: localUrl, filename: file.name },
        update: { filename: file.name },
      });
    } catch (dbError) {
      console.error("[upload-api] media index failed:", dbError);
    }

    console.log("[upload-api] local success", { url: localUrl });
    return NextResponse.json({ url: localUrl });
  } catch (error) {
    console.error("Upload error:", error);
    console.error("[upload-api] context", {
      name: file.name,
      type: mimeType,
      size: file.size,
    });

    const detail = error instanceof Error ? error.message : String(error);
    const accessHint =
      /access|public|private|BlobAccess/i.test(detail)
        ? " Ensure your Vercel Blob store access mode is Public (Storage → your store → Settings)."
        : "";
    const tokenHint =
      /BLOB_READ_WRITE_TOKEN|blob credentials|Invalid.*token/i.test(detail)
        ? " Connect a Blob store in Vercel → Storage."
        : "";

    return NextResponse.json(
      {
        error: `Upload failed: ${detail}.${accessHint}${tokenHint}`,
      },
      { status: 500 }
    );
  }
}
