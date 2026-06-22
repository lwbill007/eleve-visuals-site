import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

export function assertBlobHttpsUrl(url: string | undefined | null, context: string): string {
  const trimmed = url?.trim();
  if (!trimmed) {
    throw new Error(`${context}: blob upload returned no url`);
  }
  if (!trimmed.startsWith("https://")) {
    throw new Error(
      `${context}: expected https:// URL, got "${trimmed.slice(0, 80)}"`
    );
  }
  try {
    new URL(trimmed);
  } catch {
    throw new Error(`${context}: malformed blob URL "${trimmed.slice(0, 80)}"`);
  }
  return trimmed;
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

  return assertBlobHttpsUrl(blob.url ?? blob.downloadUrl, "Blob put");
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
