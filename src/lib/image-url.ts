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
  const raw = file.type?.trim().toLowerCase();
  if (raw) {
    if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
    if (raw === "image/x-png") return "image/png";
    return raw;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    heic: "image/heic",
    heif: "image/heif",
  };
  return map[ext || ""] || "application/octet-stream";
}

export function buildUploadPathname(file: File, folder = "uploads"): string {
  const mimeType = inferMimeType(file);
  const extFromMime = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = safeBase ? `${safeBase}-${suffix}.${extFromMime}` : `${suffix}.${extFromMime}`;
  return `${folder}/${filename}`;
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
