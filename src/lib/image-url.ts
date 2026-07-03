const BLOB_HOST_PATTERN = /\.public\.blob\.vercel-storage\.com/i;

export function isVercelBlobUrl(url: string): boolean {
  return BLOB_HOST_PATTERN.test(url);
}

export function isLocalUploadPath(value: string): boolean {
  return value.startsWith("/uploads/");
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

export function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|m4a|ogg|aac|flac)(\?|#|$)/i.test(url);
}

export function isDocumentUrl(url: string): boolean {
  return /\.(pdf)(\?|#|$)/i.test(url);
}

/** Normalize the many browser-reported audio variants to a canonical mime. */
function normalizeReportedMime(raw: string): string {
  switch (raw) {
    case "image/jpg":
    case "image/pjpeg":
      return "image/jpeg";
    case "image/x-png":
      return "image/png";
    case "audio/mp3":
      return "audio/mpeg";
    case "audio/x-m4a":
    case "audio/m4a":
    case "audio/x-mp4":
      return "audio/mp4";
    case "audio/x-wav":
    case "audio/wave":
    case "audio/vnd.wave":
      return "audio/wav";
    case "audio/x-flac":
      return "audio/flac";
    case "audio/x-aac":
      return "audio/aac";
    case "video/x-m4v":
      return "video/mp4";
    default:
      return raw;
  }
}

export function inferMimeType(file: File): string {
  const raw = file.type?.trim().toLowerCase();
  if (raw) {
    return normalizeReportedMime(raw);
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
    mov: "video/quicktime",
    m4v: "video/mp4",
    heic: "image/heic",
    heif: "image/heif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    pdf: "application/pdf",
  };
  return map[ext || ""] || "application/octet-stream";
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "application/pdf": "pdf",
};

/** Map a (normalized) mime type to a sensible file extension. */
export function extensionForMime(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] || mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
}

const ALLOWED_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4", "m4v"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
  "video/x-m4v": ["m4v", "mp4"],
  "audio/mpeg": ["mp3"],
  "audio/wav": ["wav"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/aac": ["aac", "m4a"],
  "audio/ogg": ["ogg"],
  "audio/flac": ["flac"],
  "application/pdf": ["pdf"],
};

/** Reject obvious extension / MIME mismatches (e.g. renamed executables). */
export function assertExtensionMatchesMime(file: File, mimeType: string): void {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) {
    throw new Error("File must include an extension (e.g. .mp4, .mov).");
  }

  const allowed = ALLOWED_EXTENSIONS[mimeType];
  if (allowed && !allowed.includes(ext)) {
    throw new Error(
      `File extension ".${ext}" does not match the detected type (${mimeType}). Rename the file or export in a supported format.`
    );
  }
}

export function buildUploadPathname(file: File, folder = "uploads"): string {
  const mimeType = inferMimeType(file);
  const extFromMime = extensionForMime(mimeType);
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
  if (isVideoUrl(trimmed) || isAudioUrl(trimmed) || isDocumentUrl(trimmed)) return false;
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
