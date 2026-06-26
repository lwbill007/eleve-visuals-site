import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { inferMimeType } from "@/lib/image-url";
import {
  putPublicBlob,
  sanitizeUploadFilename,
  saveLocalUpload,
} from "@/lib/upload-server";
import { SESSION_PORTFOLIO_MAX_BYTES } from "@/lib/upload-constants";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "submit:session-upload");
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const honeypot = (formData.get("_hp") ?? formData.get("website")) as string | null;

  if (honeypot?.trim()) {
    return NextResponse.json({ ok: true, url: "" });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = inferMimeType(file);

  console.log("[session-upload] received", {
    name: file.name,
    type: mimeType,
    reportedType: file.type,
    size: file.size,
  });

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > SESSION_PORTFOLIO_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const filename = sanitizeUploadFilename(file.name, mimeType);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const blobUrl = await putPublicBlob(`applications/${filename}`, buffer, mimeType);

    if (blobUrl) {
      try {
        await prisma.mediaAsset.create({
          data: {
            url: blobUrl,
            filename: file.name,
            alt: "Session application portfolio",
          },
        });
      } catch {
        /* optional index */
      }
      console.log("[session-upload] success", { url: blobUrl });
      return NextResponse.json({ url: blobUrl });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Upload storage is not configured" },
        { status: 500 }
      );
    }

    const localUrl = await saveLocalUpload("applications", filename, buffer);
    console.log("[session-upload] local success", { url: localUrl });
    return NextResponse.json({ url: localUrl });
  } catch (error) {
    console.error("Upload error:", error);
    console.error("[session-upload] context", {
      name: file.name,
      type: mimeType,
      size: file.size,
    });
    const detail = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
