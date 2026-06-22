"use client";

import { adminFetch } from "@/lib/admin-fetch";
import {
  assertValidImageUrl,
  assertValidMediaUrl,
  inferMimeType,
} from "@/lib/image-url";

function humanizeUploadError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error("Upload failed");

  const msg = error.message;
  if (
    /did not match the expected pattern/i.test(msg) ||
    /^invalid url$/i.test(msg.trim())
  ) {
    return new Error(
      "Upload failed: invalid image URL returned from storage. Confirm Vercel Blob is connected with public access."
    );
  }

  return error;
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

async function postUpload(
  file: File,
  endpoint: string,
  validate: (url: string) => void
): Promise<string> {
  const mimeType = inferMimeType(file);
  console.log("[upload] start", {
    name: file.name,
    type: mimeType,
    reportedType: file.type,
    size: file.size,
  });

  try {
    const formData = new FormData();
    formData.append("file", file);

    const fetcher = endpoint.startsWith("/api/admin") ? adminFetch : fetch;
    const res = await fetcher(endpoint, { method: "POST", body: formData });
    const text = await res.text();
    const data = parseUploadJson(text, res.status);

    console.log("[upload] response", { status: res.status, data });

    if (!res.ok) {
      const message =
        typeof data.error === "string" ? data.error : `Upload failed (${res.status})`;
      throw new Error(message);
    }

    const url = extractUploadUrl(data);
    validate(url);

    console.log("[upload] success", { url });
    return url;
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
