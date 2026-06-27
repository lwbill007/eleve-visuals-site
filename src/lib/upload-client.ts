"use client";

import { upload as blobClientUpload } from "@vercel/blob/client";
import { adminFetch } from "@/lib/admin-fetch";
import {
  assertValidImageUrl,
  assertValidMediaUrl,
  buildUploadPathname,
  inferMimeType,
} from "@/lib/image-url";
import {
  blobFolderForMime,
  isAllowedUploadMime,
  maxBytesForMime,
  MAX_VIDEO_LABEL,
  SESSION_PORTFOLIO_MAX_BYTES,
  VERCEL_SERVER_MAX_BYTES,
} from "@/lib/upload-constants";

function humanizeUploadError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error("Upload failed");

  const msg = error.message;
  if (
    /did not match the expected pattern/i.test(msg) ||
    /^invalid url$/i.test(msg.trim())
  ) {
    return new Error(
      "Upload failed: invalid image URL from storage. Confirm Vercel Blob is connected with public access."
    );
  }

  if (/413|payload too large|body size limit/i.test(msg)) {
    return new Error(
      "Upload failed: file exceeds Vercel's 4.5MB server limit. Retrying via direct Blob upload."
    );
  }

  return error;
}

function validateFileBeforeUpload(file: File, endpoint: string): string {
  const mimeType = inferMimeType(file);

  if (!isAllowedUploadMime(mimeType)) {
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      throw new Error(
        "HEIC photos are not supported. On iPhone: Settings → Camera → Formats → Most Compatible, or export as JPEG."
      );
    }
    throw new Error(
      `Unsupported file type (${mimeType || "unknown"}). Use JPEG, PNG, WebP, GIF, MP4, or WebM.`
    );
  }

  const maxSize = endpoint.includes("/api/submit/session/upload")
    ? SESSION_PORTFOLIO_MAX_BYTES
    : maxBytesForMime(mimeType);
  if (file.size > maxSize) {
    throw new Error(
      mimeType.startsWith("video/")
        ? `Video too large (max ${MAX_VIDEO_LABEL})`
        : endpoint.includes("/api/submit/session/upload")
          ? "Image too large (max 5MB)"
          : "Image too large (max 10MB)"
    );
  }

  return mimeType;
}

async function indexMediaAsset(url: string, filename: string) {
  try {
    await adminFetch("/api/admin/media/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, filename }),
    });
  } catch (error) {
    console.warn("[upload] media index failed:", error);
  }
}

function shouldUseDirectBlobUpload(endpoint: string): boolean {
  return (
    endpoint.startsWith("/api/admin") && process.env.NODE_ENV === "production"
  );
}

async function uploadViaDirectBlob(
  file: File,
  validate: (url: string) => void
): Promise<string> {
  const mimeType = inferMimeType(file);
  const pathname = buildUploadPathname(file, blobFolderForMime(mimeType));

  console.log("[upload] direct blob", {
    name: file.name,
    type: mimeType,
    size: file.size,
    pathname,
  });

  const blob = await blobClientUpload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload/client",
    contentType: mimeType,
  });

  console.log("[upload] direct blob response", blob);

  const url = blob.url?.trim();
  if (!url) {
    throw new Error("Upload completed but storage returned no URL");
  }

  validate(url);
  await indexMediaAsset(url, file.name);
  return url;
}

function parseUploadJson(text: string, status: number): Record<string, unknown> {
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    console.error("[upload] invalid JSON response", {
      status,
      body: text.slice(0, 300),
    });
    throw new Error(`Upload failed (${status}): server returned invalid response`);
  }
}

function extractUploadUrl(data: Record<string, unknown>): string {
  if (typeof data.url === "string" && data.url.trim()) {
    return data.url.trim();
  }

  if (typeof data.pathname === "string" && data.pathname.trim()) {
    throw new Error(
      "Upload API returned pathname instead of absolute URL — storage misconfigured"
    );
  }

  throw new Error("Upload response missing url field");
}

async function uploadViaServerRoute(
  file: File,
  endpoint: string,
  validate: (url: string) => void
): Promise<string> {
  if (
    process.env.NODE_ENV === "production" &&
    file.size > VERCEL_SERVER_MAX_BYTES
  ) {
    throw new Error("FILE_TOO_LARGE_FOR_SERVER");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("_hp", "");

  const fetcher = endpoint.startsWith("/api/admin") ? adminFetch : fetch;
  const res = await fetcher(endpoint, { method: "POST", body: formData });
  const text = await res.text();
  const data = parseUploadJson(text, res.status);

  console.log("[upload] server response", { status: res.status, data });

  if (!res.ok) {
    const message =
      typeof data.error === "string" ? data.error : `Upload failed (${res.status})`;
    if (res.status === 413) {
      throw new Error("FILE_TOO_LARGE_FOR_SERVER");
    }
    throw new Error(message);
  }

  const url = extractUploadUrl(data);
  validate(url);
  return url;
}

async function postUpload(
  file: File,
  endpoint: string,
  validate: (url: string) => void
): Promise<string> {
  const mimeType = validateFileBeforeUpload(file, endpoint);

  console.log("[upload] start", {
    name: file.name,
    type: mimeType,
    reportedType: file.type,
    size: file.size,
    mode: shouldUseDirectBlobUpload(endpoint) ? "direct-blob" : "server",
  });

  try {
    if (shouldUseDirectBlobUpload(endpoint)) {
      return await uploadViaDirectBlob(file, validate);
    }

    try {
      return await uploadViaServerRoute(file, endpoint, validate);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "FILE_TOO_LARGE_FOR_SERVER" ||
          error.message.includes("413")) &&
        endpoint.startsWith("/api/admin")
      ) {
        console.log("[upload] falling back to direct blob upload");
        return await uploadViaDirectBlob(file, validate);
      }
      throw error;
    }
  } catch (error) {
    console.error("Upload error:", error);
    console.error("[upload] context", {
      name: file.name,
      type: mimeType,
      size: file.size,
    });
    throw humanizeUploadError(error);
  }
}

export async function uploadImageFile(
  file: File,
  endpoint = "/api/admin/upload"
): Promise<string> {
  return postUpload(file, endpoint, assertValidImageUrl);
}

export async function uploadMediaFile(
  file: File,
  endpoint = "/api/admin/upload"
): Promise<string> {
  return postUpload(file, endpoint, assertValidMediaUrl);
}
