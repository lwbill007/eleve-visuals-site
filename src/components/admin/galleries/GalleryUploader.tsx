"use client";

import { useCallback, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

type UploadState = "queued" | "uploading" | "processing" | "ready" | "failed";

type Item = {
  key: string;
  file: File;
  state: UploadState;
  progress: number;
  photoId?: string;
  error?: string;
};

/** Three at a time: enough to saturate a connection, few enough to stay responsive. */
const CONCURRENCY = 3;

/**
 * Direct-to-R2 batch upload.
 *
 * Each file: ask for a signed PUT, upload straight to R2 (never through Vercel),
 * then ask the server to derive variants. Every step is per-file, so one bad
 * file fails visibly on its own row and can be retried without touching the rest.
 */
export default function GalleryUploader({ galleryId }: { galleryId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((key: string, patch: Partial<Item>) => {
    setItems((current) => current.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }, []);

  const uploadOne = useCallback(
    async (item: Item) => {
      update(item.key, { state: "uploading", progress: 0, error: undefined });
      try {
        const res = await adminFetch(`/api/admin/galleries/${galleryId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            mimeType: item.file.type || "image/jpeg",
            size: item.file.size,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Upload could not start.");

        // XHR rather than fetch: fetch still has no upload progress event, and a
        // photographer pushing 4GB deserves a real progress bar.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", body.uploadUrl);
          xhr.setRequestHeader("Content-Type", item.file.type || "image/jpeg");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              update(item.key, { progress: Math.round((event.loaded / event.total) * 100) });
            }
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Storage rejected the upload (${xhr.status}).`));
          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(item.file);
        });

        update(item.key, { state: "processing", progress: 100, photoId: body.photoId });

        const processed = await adminFetch(
          `/api/admin/galleries/${galleryId}/photos/${body.photoId}/process`,
          { method: "POST" }
        );
        if (!processed.ok) {
          const err = await processed.json().catch(() => ({}));
          throw new Error(err.error ?? "Processing failed.");
        }
        update(item.key, { state: "ready" });
      } catch (error) {
        update(item.key, {
          state: "failed",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [galleryId, update]
  );

  const runQueue = useCallback(
    async (queue: Item[]) => {
      // A simple sliding window; no dependency needed for three lanes.
      let cursor = 0;
      async function lane() {
        while (cursor < queue.length) {
          const item = queue[cursor++];
          await uploadOne(item);
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, lane));
    },
    [uploadOne]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!incoming.length) return;

      setItems((current) => {
        // Same name and size twice in one batch is almost always a double-drop.
        const seen = new Set(current.map((i) => `${i.file.name}:${i.file.size}`));
        const fresh = incoming
          .filter((f) => !seen.has(`${f.name}:${f.size}`))
          .map((file) => ({
            key: `${file.name}:${file.size}:${crypto.randomUUID()}`,
            file,
            state: "queued" as UploadState,
            progress: 0,
          }));
        void runQueue(fresh);
        return [...current, ...fresh];
      });
    },
    [runQueue]
  );

  const done = items.filter((i) => i.state === "ready").length;
  const failed = items.filter((i) => i.state === "failed");

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`border border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-stone"
        }`}
      >
        <p className="font-body text-sm text-cream">Drag photographs here</p>
        <p className="mt-2 font-body text-xs text-muted">JPEG, PNG, WebP, AVIF or TIFF · up to 200MB each</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 border border-stone px-6 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.28em] text-cream transition-colors hover:border-accent hover:text-accent"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between font-body text-[0.58rem] uppercase tracking-[0.26em]">
            <span className="text-muted">
              {done} of {items.length} ready
            </span>
            {failed.length > 0 ? (
              <button
                type="button"
                onClick={() => void runQueue(failed)}
                className="text-accent transition-opacity hover:opacity-70"
              >
                Retry {failed.length} failed
              </button>
            ) : null}
          </div>

          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1" aria-live="polite">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-4 border border-stone/50 px-4 py-2.5">
                <span className="flex-1 truncate font-body text-xs text-cream">{item.file.name}</span>
                <span
                  className={`font-body text-[0.55rem] uppercase tracking-[0.22em] ${
                    item.state === "ready"
                      ? "text-accent"
                      : item.state === "failed"
                        ? "text-red-400"
                        : "text-muted"
                  }`}
                >
                  {item.state === "uploading"
                    ? `${item.progress}%`
                    : item.state === "failed"
                      ? item.error ?? "Failed"
                      : item.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
