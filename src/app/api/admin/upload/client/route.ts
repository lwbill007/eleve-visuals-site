import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_VIDEO_BYTES,
  UPLOAD_ALL_TYPES,
} from "@/lib/upload-constants";

export const runtime = "nodejs";

async function indexMediaAsset(url: string, filename: string) {
  try {
    await prisma.mediaAsset.upsert({
      where: { url },
      create: { url, filename },
      update: { filename },
    });
  } catch (error) {
    console.error("[upload-client-api] media index failed:", error);
  }
}

function tokenValidUntil(clientPayload: string | null): number {
  const oneHour = 60 * 60 * 1000;
  const maxWindow = 24 * 60 * 60 * 1000;
  let windowMs = oneHour;

  if (clientPayload) {
    try {
      const meta = JSON.parse(clientPayload) as { size?: number };
      if (typeof meta.size === "number" && meta.size > 0) {
        // ~2 minutes per 100MB, minimum 1 hour, capped at 24 hours.
        const perHundredMb = Math.ceil(meta.size / (100 * 1024 * 1024)) * 2 * 60 * 1000;
        windowMs = Math.min(maxWindow, Math.max(oneHour, perHundredMb));
      }
    } catch {
      // ignore malformed client payload
    }
  }

  return Date.now() + windowMs;
}

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        try {
          await requireAdmin();
        } catch {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: [...UPLOAD_ALL_TYPES],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          access: "public",
          addRandomSuffix: true,
          validUntil: tokenValidUntil(clientPayload),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        const filename = blob.pathname.split("/").pop() || "upload";
        await indexMediaAsset(blob.url, filename);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[upload-client-api] error:", error);
    const detail = error instanceof Error ? error.message : String(error);

    if (/unauthorized/i.test(detail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accessHint =
      /access|public|private|BlobAccess/i.test(detail)
        ? " Use a Public Vercel Blob store (Storage → Settings)."
        : "";
    const tokenHint =
      /BLOB_READ_WRITE_TOKEN|blob credentials|Invalid.*token/i.test(detail)
        ? " Connect a Blob store to this project in Vercel → Storage."
        : "";

    return NextResponse.json(
      { error: `Upload failed: ${detail}.${accessHint}${tokenHint}` },
      { status: 400 }
    );
  }
}
