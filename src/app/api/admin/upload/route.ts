import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { inferMimeType } from "@/lib/image-url";
import {
  putPublicBlob,
  sanitizeUploadFilename,
  saveLocalUpload,
} from "@/lib/upload-server";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function maxSizeForType(mimeType: string): number {
  return VIDEO_TYPES.includes(mimeType) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

function blobFolderForType(mimeType: string): string {
  return VIDEO_TYPES.includes(mimeType) ? "uploads/videos" : "uploads";
}

function localSubdirForType(mimeType: string): string {
  return VIDEO_TYPES.includes(mimeType) ? "videos" : "";
}

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

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM" },
      { status: 400 }
    );
  }

  const maxSize = maxSizeForType(mimeType);
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error: VIDEO_TYPES.includes(mimeType)
          ? "Video too large (max 50MB)"
          : "File too large (max 10MB)",
      },
      { status: 400 }
    );
  }

  const filename = sanitizeUploadFilename(file.name, mimeType);
  const buffer = Buffer.from(await file.arrayBuffer());
  const blobPath = `${blobFolderForType(mimeType)}/${filename}`;

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
            "Uploads on Vercel require a Blob store. In Vercel → Storage, create a Public Blob store, connect it to this project, then redeploy.",
        },
        { status: 500 }
      );
    }

    const localUrl = await saveLocalUpload(localSubdirForType(mimeType), filename, buffer);

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

    return NextResponse.json(
      {
        error: process.env.VERCEL
          ? `Upload failed: ${detail}.${accessHint}`
          : `Upload failed: ${detail}`,
      },
      { status: 500 }
    );
  }
}
