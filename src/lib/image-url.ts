const BLOB_HOST_PATTERN = /\.public\.blob\.vercel-storage\.com/i;

export function isVercelBlobUrl(url: string): boolean {
  return BLOB_HOST_PATTERN.test(url);
}

export function isLocalUploadPath(value: string): boolean {
  return value.startsWith("/uploads/");
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return map[ext || ""] || "application/octet-stream";
}

/** Parse URL without leaking browser-native validation messages. */
export function tryParseHttpUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isAbsoluteHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  const parsed = tryParseHttpUrl(value);
  return parsed?.protocol === "https:";
}

/** Safe for admin preview `src` — absolute https or local /uploads/ path only. */
export function isRenderableImageSrc(src: string | null | undefined): src is string {
  if (!src || typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (isVideoUrl(trimmed)) return false;
  return isLocalUploadPath(trimmed) || isAbsoluteHttpsUrl(trimmed);
}

function assertValidStoredUrl(url: string, label: string): void {
  const trimmed = url?.trim();
  if (!trimmed) {
    throw new Error(`Invalid uploaded ${label} URL: empty`);
  }

  if (isLocalUploadPath(trimmed)) {
    return;
  }

  // Reject bare pathnames (common Blob mistake) before URL parsing.
  if (!trimmed.includes("://")) {
    throw new Error(
      `Invalid uploaded ${label} URL: expected https:// URL, received pathname "${trimmed.slice(0, 80)}"`
    );
  }

  if (!trimmed.startsWith("https://")) {
    throw new Error(
      `Invalid uploaded ${label} URL: must use https:// (received: ${trimmed.slice(0, 80)})`
    );
  }

  if (!tryParseHttpUrl(trimmed)) {
    throw new Error(`Invalid uploaded ${label} URL: malformed (${trimmed.slice(0, 80)})`);
  }
}

export function assertValidImageUrl(url: string): void {
  assertValidStoredUrl(url, "image");
}

export function assertValidMediaUrl(url: string): void {
  assertValidStoredUrl(url, "media");
}
