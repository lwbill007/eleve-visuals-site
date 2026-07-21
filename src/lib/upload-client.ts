"use client";

import { upload as blobClientUpload } from "@vercel/blob/client";
import { adminFetch } from "@/lib/admin-fetch";
import {
  assertValidImageUrl,
  assertValidMediaUrl,
  assertExtensionMatchesMime,
  buildUploadPathname,
  inferMimeType,
} from "@/lib/image-url";
import { beginUpload, endUpload } from "@/lib/upload-tracker";
import {
  BLOB_MULTIPART_THRESHOLD_BYTES,
  BLOB_VIDEO_MULTIPART_THRESHOLD_BYTES,
  blobFolderForMime,
  isAllowedUploadMime,
  isVideoMime,
  maxBytesForMime,
  maxLabelForMime,
  SESSION_PORTFOLIO_MAX_BYTES,
  VERCEL_SERVER_MAX_BYTES,
} from "@/lib/upload-constants";

export type UploadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percent: number;
}) => void;

export type UploadFileOptions = {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal;
  fields?: Record<string, string>;
};

function normalizeUploadOptions(
  options?: UploadProgressCallback | UploadFileOptions
): UploadFileOptions {
  if (!options) return {};
  if (typeof options === "function") return { onProgress: options };
  return options;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Upload cancelled", "AbortError");
  }
}

type ProgressEvent = {
  loaded: number;
  total: number;
  percentage?: number;
};

/**
 * Vercel Blob fires onUploadProgress(0%) for every sub-request (token, upload, complete).
 * This wrapper ignores tiny handshake bodies and never decreases the reported percent.
 */
function createMonotonicProgressReporter(
  fileSize: number,
  onProgress?: UploadProgressCallback
): ((event: ProgressEvent) => void) | undefined {
  if (!onProgress) return undefined;

  let maxPercent = 0;

  return (event: ProgressEvent) => {
    const { loaded, total } = event;
    const rawPercentage =
      typeof event.percentage === "number"
        ? event.percentage
        : total > 0
          ? (loaded / total) * 100
          : 0;

    // Token / completion pings carry a tiny body — don't reset the bar to 0%.
    const isHandshake = fileSize > 256 * 1024 && total > 0 && total < fileSize * 0.01;
    if (isHandshake) {
      maxPercent = Math.max(maxPercent, 2);
    } else if (total >= fileSize * 0.5 || fileSize === 0) {
      const filePercent =
        fileSize > 0 ? (Math.min(loaded, fileSize) / fileSize) * 100 : rawPercentage;
      maxPercent = Math.max(maxPercent, Math.min(99, Math.round(filePercent)));
    } else {
      maxPercent = Math.max(maxPercent, Math.min(99, Math.round(rawPercentage)));
    }

    const safeTotal = fileSize > 0 ? fileSize : total;
    const safeLoaded =
      safeTotal > 0
        ? Math.min(safeTotal, Math.round((maxPercent / 100) * safeTotal))
        : loaded;

    onProgress({
      loaded: safeLoaded,
      total: safeTotal,
      percent: maxPercent,
    });
  };
}

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

  if (/failed to retrieve the client token/i.test(msg)) {
    return new Error(
      "Upload failed: could not connect to storage. Stay signed in to admin and confirm Vercel Blob is connected to this project."
    );
  }

  if (/token.*expir|expired/i.test(msg)) {
    return new Error(
      "Upload failed: storage token expired during upload. Try again on a faster connection or use a smaller file."
    );
  }

  if (/abort|cancel/i.test(msg)) {
    return new Error("Upload cancelled.");
  }

  if (/network error|failed to fetch|load failed/i.test(msg)) {
    return new Error(
      "Upload failed: network connection interrupted. Check your connection and try again."
    );
  }

  return error;
}

function shouldUseMultipartUpload(file: File, mimeType: string): boolean {
  const threshold = isVideoMime(mimeType)
    ? BLOB_VIDEO_MULTIPART_THRESHOLD_BYTES
    : BLOB_MULTIPART_THRESHOLD_BYTES;
  return file.size >= threshold;
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
      `Unsupported file type (${mimeType || "unknown"}). Use JPEG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, WAV, M4A, AAC, OGG, FLAC, or PDF.`
    );
  }

  assertExtensionMatchesMime(file, mimeType);

  const maxSize = endpoint.includes("/api/submit/session/upload")
    ? SESSION_PORTFOLIO_MAX_BYTES
    : maxBytesForMime(mimeType);
  if (file.size > maxSize) {
    throw new Error(
      endpoint.includes("/api/submit/session/upload")
        ? "Image too large (max 5MB)"
        : `File too large (max ${maxLabelForMime(mimeType)})`
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

function shouldUseDirectBlobUpload(file: File, endpoint: string): boolean {
  if (!endpoint.startsWith("/api/admin")) return false;
  const mimeType = inferMimeType(file);
  // Videos routinely exceed Vercel's ~4.5MB serverless body limit — always bypass the server route.
  if (isVideoMime(mimeType)) return true;
  if (file.size > VERCEL_SERVER_MAX_BYTES) return true;
  return process.env.NODE_ENV === "production";
}

async function uploadViaDirectBlob(
  file: File,
  validate: (url: string) => void,
  options: UploadFileOptions = {}
): Promise<string> {
  const { onProgress, signal } = options;
  throwIfAborted(signal);

  const mimeType = inferMimeType(file);
  const pathname = buildUploadPathname(file, blobFolderForMime(mimeType));

  console.log("[upload] direct blob", {
    name: file.name,
    type: mimeType,
    size: file.size,
    pathname,
  });

  const reportProgress = createMonotonicProgressReporter(file.size, onProgress);

  const multipart = shouldUseMultipartUpload(file, mimeType);

  const blob = await blobClientUpload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload/client",
    contentType: mimeType,
    multipart,
    clientPayload: JSON.stringify({
      size: file.size,
      mime: mimeType,
      filename: file.name,
    }),
    abortSignal: signal,
    onUploadProgress: reportProgress
      ? (event) =>
          reportProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: event.percentage,
          })
      : undefined,
  });

  console.log("[upload] direct blob response", blob);

  const url = blob.url?.trim();
  if (!url) {
    throw new Error("Upload completed but storage returned no URL");
  }

  validate(url);
  await indexMediaAsset(url, file.name);
  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
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
  validate: (url: string) => void,
  options: UploadFileOptions = {}
): Promise<string> {
  const { onProgress, signal } = options;
  throwIfAborted(signal);

  if (
    process.env.NODE_ENV === "production" &&
    file.size > VERCEL_SERVER_MAX_BYTES
  ) {
    throw new Error("FILE_TOO_LARGE_FOR_SERVER");
  }

  if (onProgress && typeof XMLHttpRequest !== "undefined") {
    return uploadViaServerRouteXhr(file, endpoint, validate, options);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("_hp", "");
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    formData.append(key, value);
  }

  const fetcher = endpoint.startsWith("/api/admin") ? adminFetch : fetch;
  const res = await fetcher(endpoint, { method: "POST", body: formData, signal });
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
  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
  return url;
}

function uploadViaServerRouteXhr(
  file: File,
  endpoint: string,
  validate: (url: string) => void,
  options: UploadFileOptions
): Promise<string> {
  const { onProgress, signal } = options;
  const reportProgress = createMonotonicProgressReporter(file.size, onProgress)!;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("_hp", "");
    for (const [key, value] of Object.entries(options.fields ?? {})) {
      formData.append(key, value);
    }

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.addEventListener("progress", (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      reportProgress({
        loaded: event.loaded,
        total,
        percentage: total > 0 ? (event.loaded / total) * 100 : 0,
      });
    });

    xhr.addEventListener("load", () => {
      signal?.removeEventListener("abort", onAbort);
      const text = xhr.responseText;
      let data: Record<string, unknown>;
      try {
        data = parseUploadJson(text, xhr.status);
      } catch (error) {
        reject(error);
        return;
      }

      if (xhr.status === 401 && typeof window !== "undefined") {
        window.location.href = "/admin/login";
        reject(new Error("Unauthorized"));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const message =
          typeof data.error === "string" ? data.error : `Upload failed (${xhr.status})`;
        if (xhr.status === 413) {
          reject(new Error("FILE_TOO_LARGE_FOR_SERVER"));
          return;
        }
        reject(new Error(message));
        return;
      }

      try {
        const url = extractUploadUrl(data);
        validate(url);
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve(url);
      } catch (error) {
        reject(error);
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed: network error")));
    xhr.addEventListener("abort", () => reject(new DOMException("Upload cancelled", "AbortError")));

    xhr.open("POST", endpoint);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

async function postUpload(
  file: File,
  endpoint: string,
  validate: (url: string) => void,
  options?: UploadProgressCallback | UploadFileOptions
): Promise<string> {
  const uploadOptions = normalizeUploadOptions(options);
  const mimeType = validateFileBeforeUpload(file, endpoint);

  console.log("[upload] start", {
    name: file.name,
    type: mimeType,
    reportedType: file.type,
    size: file.size,
    mode: shouldUseDirectBlobUpload(file, endpoint) ? "direct-blob" : "server",
  });

  beginUpload();
  try {
    if (shouldUseDirectBlobUpload(file, endpoint)) {
      try {
        return await uploadViaDirectBlob(file, validate, uploadOptions);
      } catch (directError) {
        if (
          process.env.NODE_ENV !== "production" &&
          file.size <= VERCEL_SERVER_MAX_BYTES
        ) {
          console.log("[upload] direct blob unavailable in dev, trying server route");
          return await uploadViaServerRoute(file, endpoint, validate, uploadOptions);
        }
        throw directError;
      }
    }

    try {
      return await uploadViaServerRoute(file, endpoint, validate, uploadOptions);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "FILE_TOO_LARGE_FOR_SERVER" ||
          error.message.includes("413")) &&
        endpoint.startsWith("/api/admin")
      ) {
        console.log("[upload] falling back to direct blob upload");
        return await uploadViaDirectBlob(file, validate, uploadOptions);
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
  } finally {
    endUpload();
  }
}

export async function uploadImageFile(
  file: File,
  endpoint = "/api/admin/upload",
  options?: UploadProgressCallback | UploadFileOptions
): Promise<string> {
  return postUpload(file, endpoint, assertValidImageUrl, options);
}

export async function uploadMediaFile(
  file: File,
  endpoint = "/api/admin/upload",
  options?: UploadProgressCallback | UploadFileOptions
): Promise<string> {
  return postUpload(file, endpoint, assertValidMediaUrl, options);
}
