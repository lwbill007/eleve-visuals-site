import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { tryParseHttpUrl } from "@/lib/image-url";

export function sanitizeUploadFilename(originalName: string, mimeType: string): string {
  const extFromMime = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const safeBase = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return safeBase ? `${safeBase}-${suffix}.${extFromMime}` : `${suffix}.${extFromMime}`;
}

export function resolveBlobPutUrl(blob: {
  url?: string | null;
  downloadUrl?: string | null;
  pathname?: string | null;
}): string {
  const candidates = [blob.url, blob.downloadUrl].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.startsWith("https://") && tryParseHttpUrl(trimmed)) {
      return trimmed;
    }
  }

  if (blob.pathname?.trim()) {
    throw new Error(
      `Blob upload returned pathname "${blob.pathname}" without an absolute https URL`
    );
  }

  throw new Error("Blob upload returned no url");
}

function canUseBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL);
}

export async function putPublicBlob(
  blobPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!canUseBlobStorage()) return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { put } = await import("@vercel/blob");
  const pathname = blobPath.replace(/^\/+/, "");

  console.log("[upload-server] blob put", {
    pathname,
    contentType,
    size: buffer.length,
    auth: token ? "token" : "oidc",
  });

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    ...(token ? { token } : {}),
  });

  console.log("[upload-server] blob response", {
    url: blob.url,
    pathname: blob.pathname,
    downloadUrl: blob.downloadUrl,
  });

  return resolveBlobPutUrl(blob);
}

export async function saveLocalUpload(
  subdir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  const urlPath = subdir ? `/uploads/${subdir}/${filename}` : `/uploads/${filename}`;
  return urlPath.replace(/\/+/g, "/");
}
