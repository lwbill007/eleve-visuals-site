import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extensionForMime, tryParseHttpUrl } from "@/lib/image-url";

export function sanitizeUploadFilename(originalName: string, mimeType: string): string {
  const extFromMime = extensionForMime(mimeType);
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

function formatBlobError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const msg = error.message;
  if (/Cannot use public access on a private store/i.test(msg)) {
    return "Your Vercel Blob store is Private. Create or connect a Public Blob store for portfolio images.";
  }
  if (/No blob credentials found|BLOB_READ_WRITE_TOKEN|Invalid.*token/i.test(msg)) {
    return "Blob storage is not connected. In Vercel → Storage, create a Public Blob store and link it to this project.";
  }
  if (/access denied|BlobAccess/i.test(msg)) {
    return "Blob access denied. Ensure the store is Public and linked to this project.";
  }

  return msg;
}

export async function putPublicBlob(
  blobPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!canUseBlobStorage()) return null;

  const { put } = await import("@vercel/blob");
  const pathname = blobPath.replace(/^\/+/, "");

  console.log("[upload-server] blob put", {
    pathname,
    contentType,
    size: buffer.length,
    hasToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });

  try {
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType,
    });

    console.log("[upload-server] blob response", {
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl,
    });

    return resolveBlobPutUrl(blob);
  } catch (error) {
    throw new Error(formatBlobError(error));
  }
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
