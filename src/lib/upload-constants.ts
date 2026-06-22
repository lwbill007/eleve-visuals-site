export const UPLOAD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const UPLOAD_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export const UPLOAD_ALL_TYPES: readonly string[] = [
  ...UPLOAD_IMAGE_TYPES,
  ...UPLOAD_VIDEO_TYPES,
];

export function isAllowedUploadMime(mimeType: string): boolean {
  return UPLOAD_ALL_TYPES.includes(mimeType);
}

/** Vercel serverless request body hard limit — server-side multipart uploads must stay under this. */
export const VERCEL_SERVER_MAX_BYTES = 4 * 1024 * 1024;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function maxBytesForMime(mimeType: string): number {
  return UPLOAD_VIDEO_TYPES.includes(mimeType as (typeof UPLOAD_VIDEO_TYPES)[number])
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
}

export function blobFolderForMime(mimeType: string): string {
  return UPLOAD_VIDEO_TYPES.includes(mimeType as (typeof UPLOAD_VIDEO_TYPES)[number])
    ? "uploads/videos"
    : "uploads";
}

export function localSubdirForMime(mimeType: string): string {
  return UPLOAD_VIDEO_TYPES.includes(mimeType as (typeof UPLOAD_VIDEO_TYPES)[number])
    ? "videos"
    : "";
}
