import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_VIDEO_BYTES,
  UPLOAD_ALL_TYPES,
  isAllowedUploadMime,
  maxBytesForMime,
} from "@/lib/upload-constants";

export const runtime = "nodejs";

type ClientUploadMeta = {
  size?: number;
  mime?: string;
  filename?: string;
};

function parseClientPayload(clientPayload: string | null): ClientUploadMeta {
  if (!clientPayload) return {};
  try {
    return JSON.parse(clientPayload) as ClientUploadMeta;
  } catch {
    return {};
  }
}

function maximumBytesForPayload(clientPayload: string | null): number {
  const meta = parseClientPayload(clientPayload);
  if (meta.mime && isAllowedUploadMime(meta.mime)) {
    return maxBytesForMime(meta.mime);
  }
  return MAX_VIDEO_BYTES;
}

function filenameFromTokenPayload(tokenPayload: string | null | undefined, fallback: string): string {
  if (!tokenPayload) return fallback;
  try {
    const parsed = JSON.parse(tokenPayload) as { filename?: string };
    if (typeof parsed.filename === "string" && parsed.filename.trim()) {
      return parsed.filename.trim();
    }
  } catch {
    // ignore
  }
  return fallback;
}

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

        const meta = parseClientPayload(clientPayload);

        return {
          allowedContentTypes: [...UPLOAD_ALL_TYPES],
          maximumSizeInBytes: maximumBytesForPayload(clientPayload),
          access: "public",
          addRandomSuffix: true,
          validUntil: tokenValidUntil(clientPayload),
          tokenPayload: JSON.stringify({
            filename: meta.filename || null,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const fallback = blob.pathname.split("/").pop() || "upload";
        const filename = filenameFromTokenPayload(tokenPayload, fallback);
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
