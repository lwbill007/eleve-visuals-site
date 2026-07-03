export const UPLOAD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const UPLOAD_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
] as const;

export const UPLOAD_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
] as const;

export const UPLOAD_DOCUMENT_TYPES = ["application/pdf"] as const;

export const UPLOAD_ALL_TYPES: readonly string[] = [
  ...UPLOAD_IMAGE_TYPES,
  ...UPLOAD_VIDEO_TYPES,
  ...UPLOAD_AUDIO_TYPES,
  ...UPLOAD_DOCUMENT_TYPES,
];

export function isAllowedUploadMime(mimeType: string): boolean {
  return UPLOAD_ALL_TYPES.includes(mimeType);
}

export function isVideoMime(mimeType: string): boolean {
  return UPLOAD_VIDEO_TYPES.includes(mimeType as (typeof UPLOAD_VIDEO_TYPES)[number]);
}

export function isAudioMime(mimeType: string): boolean {
  return UPLOAD_AUDIO_TYPES.includes(mimeType as (typeof UPLOAD_AUDIO_TYPES)[number]);
}

export function isDocumentMime(mimeType: string): boolean {
  return UPLOAD_DOCUMENT_TYPES.includes(mimeType as (typeof UPLOAD_DOCUMENT_TYPES)[number]);
}

/** Vercel serverless request body hard limit — server-side multipart uploads must stay under this. */
export const VERCEL_SERVER_MAX_BYTES = 4 * 1024 * 1024;

export const SESSION_PORTFOLIO_MAX_BYTES = 5 * 1024 * 1024;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_VIDEO_LABEL = "2GB";
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_AUDIO_LABEL = "100MB";
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_DOCUMENT_LABEL = "25MB";

export function maxBytesForMime(mimeType: string): number {
  if (isVideoMime(mimeType)) return MAX_VIDEO_BYTES;
  if (isAudioMime(mimeType)) return MAX_AUDIO_BYTES;
  if (isDocumentMime(mimeType)) return MAX_DOCUMENT_BYTES;
  return MAX_IMAGE_BYTES;
}

/** Human-friendly size limit label for a given mime, used in error messages. */
export function maxLabelForMime(mimeType: string): string {
  if (isVideoMime(mimeType)) return MAX_VIDEO_LABEL;
  if (isAudioMime(mimeType)) return MAX_AUDIO_LABEL;
  if (isDocumentMime(mimeType)) return MAX_DOCUMENT_LABEL;
  return "10MB";
}

export function blobFolderForMime(mimeType: string): string {
  if (isVideoMime(mimeType)) return "uploads/videos";
  if (isAudioMime(mimeType)) return "uploads/audio";
  if (isDocumentMime(mimeType)) return "uploads/documents";
  return "uploads";
}

export function localSubdirForMime(mimeType: string): string {
  if (isVideoMime(mimeType)) return "videos";
  if (isAudioMime(mimeType)) return "audio";
  if (isDocumentMime(mimeType)) return "documents";
  return "";
}
