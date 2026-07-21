import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { detectImageMime } from "@/lib/image-url";
import {
  sanitizeUploadFilename,
  saveLocalUpload,
} from "@/lib/upload-server";
import {
  applicantMediaUrl,
  putPrivateApplicantBlob,
} from "@/lib/session-private-media";
import { SESSION_PORTFOLIO_MAX_BYTES } from "@/lib/upload-constants";
import {
  hashSessionUploadToken,
  verifySessionUploadToken,
} from "@/lib/session-upload-token";
import {
  getSessionVolumeForApplication,
  validateSessionApplicationGate,
} from "@/lib/session-application-server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const honeypot = (formData.get("_hp") ?? formData.get("website")) as string | null;
  const uploadToken = formData.get("uploadToken");
  const volumeId = formData.get("volumeId");

  if (honeypot?.trim()) {
    return NextResponse.json({ ok: true, url: "" });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (
    typeof uploadToken !== "string" ||
    typeof volumeId !== "string" ||
    !(await verifySessionUploadToken(uploadToken, volumeId))
  ) {
    return NextResponse.json({ error: "Upload authorization expired" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(ip, "submit:session-upload");
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  const volume = await getSessionVolumeForApplication(volumeId);
  if (!volume || !(await validateSessionApplicationGate(volume)).ok) {
    return NextResponse.json({ error: "Applications are not open" }, { status: 403 });
  }

  if (file.size > SESSION_PORTFOLIO_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageMime(buffer);
  if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Only valid JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }
  const filename = sanitizeUploadFilename(file.name, mimeType);
  const uploadTokenHash = hashSessionUploadToken(uploadToken);

  try {
    if (process.env.SESSION_UPLOAD_BLOB_STORE_ID) {
      const blobUrl = await putPrivateApplicantBlob(
        `applications/${volumeId}/${filename}`,
        buffer,
        mimeType
      );
      const asset = await prisma.mediaAsset.create({
        data: {
          url: blobUrl,
          filename: file.name,
          alt: "Session application portfolio",
          purpose: "session-application",
          uploadTokenHash,
        },
      });
      const previewUrl = applicantMediaUrl(new URL(request.url).origin, asset.id, uploadToken);
      console.log("[session-upload] private success", { assetId: asset.id });
      return NextResponse.json({ url: previewUrl });
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
