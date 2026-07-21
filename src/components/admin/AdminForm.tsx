"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";
import { uploadImageFile, uploadMediaFile, type UploadProgressCallback } from "@/lib/upload-client";
import { ADMIN_VIDEO_ACCEPT } from "@/lib/upload-constants";
import { toVideoEmbed } from "@/lib/video-embed";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import { isVideoUrl, isAudioUrl, isDocumentUrl } from "@/lib/image-url";
import { useUploadsActive } from "@/lib/upload-tracker";

interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  alt: string;
}

function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  multiple = false,
  imagesOnly = true,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  imagesOnly?: boolean;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPicked([]);
    setLoading(true);
    adminFetch("/api/admin/media")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .finally(() => setLoading(false));

    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const visibleItems = imagesOnly
    ? items.filter(
        (item) => !isVideoUrl(item.url) && !isAudioUrl(item.url) && !isDocumentUrl(item.url)
      )
    : items;

  function toggle(url: string) {
    if (multiple) {
      setPicked((prev) =>
        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
      );
    } else {
      onSelect([url]);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/90 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-library-title"
        className="flex max-h-[100dvh] w-full max-w-4xl flex-col border border-stone/40 bg-ink sm:max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-stone/30 px-4 py-3 sm:px-6 sm:py-4">
          <h3 id="media-library-title" className="font-display text-base text-cream sm:text-lg">Media Library</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="admin-touch-btn-compact min-w-16 border border-stone/40 text-fog hover:text-cream"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-center text-fog">Loading...</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-center text-fog">
              {imagesOnly ? "No images in the library yet." : "No media yet. Upload a file first."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.url)}
                  className={cn(
                    "relative aspect-square overflow-hidden border bg-charcoal text-left",
                    picked.includes(item.url) ? "border-accent ring-1 ring-accent" : "border-stone/30"
                  )}
                >
                  <AdminPreviewImage src={item.url} alt={item.alt || item.filename} fill className="object-cover" sizes="160px" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/80 px-2 py-1 text-[10px] text-cream">
                    {item.filename || "Untitled"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {multiple && (
          <div className="flex flex-col gap-2 border-t border-stone/30 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="admin-touch-btn border border-stone/50 text-fog"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => {
                onSelect(picked);
                onClose();
              }}
              className="admin-touch-btn bg-cream text-ink disabled:opacity-50"
            >
              Add {picked.length || ""} selected
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      onChange(await uploadImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {!value ? (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="admin-touch-btn border border-stone/50 text-fog hover:text-cream disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload new"}
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="admin-touch-btn border border-stone/50 text-accent"
          >
            Choose from library
          </button>
        </div>
      ) : null}
      <div
        className={cn(
          "relative overflow-hidden border border-dashed border-stone/50 bg-charcoal/30",
          value
            ? "aspect-video max-h-[min(50vh,320px)] w-full sm:max-h-none"
            : "flex min-h-[120px] items-center justify-center p-6"
        )}
      >
        {value ? (
          <AdminPreviewImage src={value} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 400px" />
        ) : (
          <p className="text-sm text-muted">No image selected</p>
        )}
      </div>
      {value ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="admin-touch-btn border border-stone/50 text-cream hover:border-fog"
          >
            Replace image
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="admin-touch-btn border border-stone/50 text-accent"
          >
            Choose from library
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="admin-touch-btn border border-red-400/60 text-red-400 hover:bg-red-400/10"
          >
            Remove image
          </button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(urls) => onChange(urls[0] ?? null)}
      />
    </div>
  );
}

interface GalleryUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  coverImage?: string | null;
  onCoverChange?: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function GalleryUpload({
  images,
  onChange,
  coverImage,
  onCoverChange,
  label,
  hint,
  className,
}: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    setError("");
    const uploaded: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
        uploaded.push(await uploadImageFile(files[i]));
      }
      const next = [...images, ...uploaded];
      onChange(next);
      if (onCoverChange && !coverImage && uploaded[0]) {
        onCoverChange(uploaded[0]);
      }
    } catch (err) {
      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
      }
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function removeAt(index: number) {
    const removed = images[index];
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    if (onCoverChange && coverImage === removed) {
      onCoverChange(null);
    }
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={cn(
                "overflow-hidden border bg-charcoal",
                coverImage === src ? "border-accent ring-1 ring-accent" : "border-stone/40"
              )}
            >
              <div className="relative aspect-square max-h-72 w-full sm:max-h-none">
                <AdminPreviewImage
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 200px"
                />
                {coverImage === src && (
                  <span className="absolute top-2 left-2 bg-accent px-2 py-1 text-[10px] tracking-wide text-ink uppercase">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 border-t border-stone/30 p-2 sm:p-3">
                {onCoverChange && coverImage !== src && (
                  <button
                    type="button"
                    onClick={() => onCoverChange(src)}
                    className="admin-touch-btn border border-stone/50 text-cream hover:border-fog"
                  >
                    Set as cover image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="admin-touch-btn border border-red-400/60 text-red-400 hover:bg-red-400/10"
                >
                  Remove photo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="admin-touch-btn min-h-[4.5rem] flex-1 border border-dashed border-stone/50 bg-charcoal/30 text-sm text-fog hover:border-fog hover:text-cream disabled:opacity-50 sm:min-h-20"
        >
          {uploading ? uploadProgress || "Uploading..." : "Upload new images"}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="admin-touch-btn min-h-[4.5rem] border border-dashed border-stone/50 bg-charcoal/30 text-sm text-accent hover:border-accent/50 sm:min-h-20 sm:px-8"
        >
          Add from library
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        multiple
        onSelect={(urls) => {
          const next = [...images, ...urls.filter((u) => !images.includes(u))];
          onChange(next);
          if (onCoverChange && !coverImage && urls[0]) onCoverChange(urls[0]);
        }}
      />
    </div>
  );
}

interface AdminFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  id?: string;
}

export function AdminField({ label, children, hint, error, id }: AdminFieldProps) {
  const generatedId = useId();
  const controlId = id ?? `admin-field-${generatedId.replace(/:/g, "")}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        id: children.props.id ?? controlId,
        "aria-describedby": children.props["aria-describedby"] ?? describedBy,
        "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
      })
    : children;

  return (
    <div className="space-y-2">
      <label htmlFor={controlId} className="block text-sm text-cream-dim">{label}</label>
      {control}
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="min-h-[100px] resize-y" {...props} />;
}

export function StringListEditor({
  label,
  items,
  onChange,
  addLabel = "Add item",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-cream-dim">{label}</p>
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="flex flex-col gap-2 sm:flex-row">
          <AdminInput
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="admin-touch-btn shrink-0 border border-stone/50 text-fog sm:w-auto"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-xs text-accent"
      >
        {addLabel}
      </button>
    </div>
  );
}

export function AdminSelect({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select {...props}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const VIDEO_ACCEPT = ADMIN_VIDEO_ACCEPT;
const VIDEO_UPLOAD_LABEL = "Upload video (MP4, WebM, or MOV — up to 2GB)";

function formatUploadProgress(progress: { percent: number; loaded: number; total: number }): string {
  if (progress.total > 0) {
    const mbLoaded = (progress.loaded / (1024 * 1024)).toFixed(1);
    const mbTotal = (progress.total / (1024 * 1024)).toFixed(1);
    return `${progress.percent}% · ${mbLoaded} / ${mbTotal} MB`;
  }
  return "Preparing upload...";
}

interface UploadProgressState {
  percent: number;
  label: string;
}

function UploadProgressBar({ percent, label }: UploadProgressState) {
  const displayPercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="mt-3 rounded border border-accent/30 bg-charcoal/60 p-4"
      role="progressbar"
      aria-valuenow={displayPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 break-words text-fog">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-accent">
          {displayPercent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone/40">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.max(displayPercent, displayPercent > 0 ? 3 : 0)}%`,
          }}
        />
      </div>
    </div>
  );
}

function makeProgressUpdater(
  setProgress: (state: UploadProgressState | null) => void,
  fileName: string,
  fileIndex?: number,
  fileCount?: number
): UploadProgressCallback {
  const prefix =
    fileCount && fileCount > 1 && fileIndex
      ? `Video ${fileIndex} of ${fileCount} · `
      : "";
  let maxPercent = 0;

  return (progress) => {
    maxPercent = Math.max(maxPercent, progress.percent);
    const normalized = { ...progress, percent: maxPercent };
    setProgress({
      percent: maxPercent,
      label: `${prefix}${fileName} — ${formatUploadProgress(normalized)}`,
    });
  };
}

function UploadCancelButton({ onCancel }: { onCancel: () => void }) {
  return (
    <button
      type="button"
      onClick={onCancel}
      className="admin-touch-btn-compact mt-2 border border-stone/50 text-fog hover:border-red-400/60 hover:text-red-400"
    >
      Cancel upload
    </button>
  );
}

interface VideoGalleryUploadProps {
  videos: string[];
  onChange: (videos: string[]) => void;
  label?: string;
  hint?: string;
  className?: string;
}

function isEmbeddableUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function VideoGalleryUpload({
  videos,
  onChange,
  label,
  hint,
  className,
}: VideoGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState | null>(null);
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setProgress(null);
    setError("Upload cancelled.");
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0 || uploading) return;

    const seen = new Set<string>();
    const uniqueFiles = files.filter((file) => {
      const key = `${file.name}:${file.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueFiles.length < files.length) {
      setError("Skipped duplicate files in this batch.");
    }

    setUploading(true);
    setError(uniqueFiles.length < files.length ? "Skipped duplicate files in this batch." : "");
    setProgress({ percent: 0, label: `${uniqueFiles[0].name} — Connecting to storage…` });
    const uploaded: string[] = [];
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for (let i = 0; i < uniqueFiles.length; i++) {
        uploaded.push(
          await uploadMediaFile(uniqueFiles[i], "/api/admin/upload", {
            signal: controller.signal,
            onProgress: makeProgressUpdater(setProgress, uniqueFiles[i].name, i + 1, uniqueFiles.length),
          })
        );
      }
      setProgress({ percent: 100, label: "Upload complete — saving to library" });
      onChange([...videos, ...uploaded]);
    } catch (err) {
      if (uploaded.length > 0) onChange([...videos, ...uploaded]);
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      abortRef.current = null;
      setUploading(false);
      setTimeout(() => setProgress(null), uploaded.length > 0 ? 1200 : 0);
    }
  }

  function addUrl() {
    if (uploading) return;
    const url = urlDraft.trim();
    if (!url) return;
    if (!videos.includes(url)) onChange([...videos, url]);
    setUrlDraft("");
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {videos.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {videos.map((src, index) => (
            <div key={`${src}-${index}`} className="overflow-hidden border border-stone/40 bg-charcoal">
              <div className="relative aspect-video w-full bg-ink">
                {isEmbeddableUrl(src) ? (
                  <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs break-all text-fog">
                    {src}
                  </div>
                ) : (
                  <video src={src} controls playsInline className="h-full w-full object-cover" />
                )}
              </div>
              <div className="border-t border-stone/30 p-2 sm:p-3">
                <button
                  type="button"
                  onClick={() => onChange(videos.filter((_, i) => i !== index))}
                  className="admin-touch-btn border border-red-400/60 text-red-400 hover:bg-red-400/10"
                >
                  Remove video
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="admin-touch-btn min-h-[4.5rem] w-full border border-dashed border-stone/50 bg-charcoal/30 text-sm text-fog hover:border-fog hover:text-cream disabled:opacity-50 sm:min-h-20"
      >
        {uploading ? "Upload in progress…" : VIDEO_UPLOAD_LABEL}
      </button>

      {progress && <UploadProgressBar percent={progress.percent} label={progress.label} />}
      {uploading && <UploadCancelButton onCancel={cancelUpload} />}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlDraft}
          placeholder="Or paste a YouTube, Vimeo, or direct video URL"
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          disabled={uploading}
          className="flex-1 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={uploading}
          className="admin-touch-btn border border-stone/50 text-accent disabled:opacity-50"
        >
          Add URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}

interface VideoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}

/** Single video field — upload a file or paste YouTube/Vimeo/direct URL (e.g. official trailer). */
export function VideoUpload({ value, onChange, label, hint, className }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState | null>(null);
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setProgress(null);
    setError("Upload cancelled.");
  }

  async function handleFile(file: File) {
    if (uploading) return;
    setUploading(true);
    setError("");
    setProgress({ percent: 0, label: `${file.name} — Connecting to storage…` });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = await uploadMediaFile(file, "/api/admin/upload", {
        signal: controller.signal,
        onProgress: makeProgressUpdater(setProgress, file.name),
      });
      setProgress({ percent: 100, label: "Upload complete" });
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      abortRef.current = null;
      setUploading(false);
      setTimeout(() => setProgress(null), 1200);
    }
  }

  function addUrl() {
    if (uploading) return;
    const url = urlDraft.trim();
    if (!url) return;
    onChange(url);
    setUrlDraft("");
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {value && (
        <div className="mb-4 overflow-hidden border border-stone/40 bg-charcoal">
          <div className="relative aspect-video w-full bg-ink">
            {toVideoEmbed(value) ? (
              <iframe
                src={toVideoEmbed(value)!}
                title="Video preview"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={value} controls playsInline className="h-full w-full object-contain" />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone/30 p-3">
            <p className="min-w-0 flex-1 truncate text-xs break-all text-muted">{value}</p>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="admin-touch-btn-compact border border-red-400/60 text-red-400 hover:bg-red-400/10"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="admin-touch-btn min-h-[4.5rem] w-full border border-dashed border-stone/50 bg-charcoal/30 text-sm text-fog hover:border-fog hover:text-cream disabled:opacity-50 sm:min-h-20"
      >
        {uploading ? "Upload in progress…" : value ? "Replace video" : VIDEO_UPLOAD_LABEL}
      </button>

      {progress && <UploadProgressBar percent={progress.percent} label={progress.label} />}
      {uploading && <UploadCancelButton onCancel={cancelUpload} />}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlDraft}
          placeholder="Or paste YouTube, Vimeo, or direct video URL"
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          disabled={uploading}
          className="flex-1 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={uploading}
          className="admin-touch-btn border border-stone/50 text-accent disabled:opacity-50"
        >
          Use URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}

function filenameFromUrl(url: string): string {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return decodeURIComponent(path.split("/").pop() || "file");
  } catch {
    return "file";
  }
}

interface FileUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  accept?: string;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  label,
  hint,
  accept = ".pdf,application/pdf",
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      onChange(await uploadMediaFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange(url);
    setUrlDraft("");
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {value && (
        <div className="mb-3 flex items-center justify-between gap-3 border border-stone/40 bg-charcoal/40 px-4 py-3">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm text-cream hover:text-accent"
          >
            {filenameFromUrl(value)}
          </a>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 border border-red-400/60 px-3 py-1 text-xs text-red-400 hover:bg-red-400/10"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="admin-touch-btn border border-stone/50 text-fog hover:text-cream disabled:opacity-50"
        >
          {uploading ? "Uploading..." : value ? "Replace file" : "Upload file"}
        </button>
        <input
          type="url"
          value={urlDraft}
          placeholder="Or paste a link (Google Doc, Dropbox, etc.)"
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          className="flex-1"
        />
        <button type="button" onClick={addUrl} className="admin-touch-btn border border-stone/50 text-accent">
          Add link
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}

interface AudioGalleryUploadProps {
  tracks: string[];
  onChange: (tracks: string[]) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function AudioGalleryUpload({ tracks, onChange, label, hint, className }: AudioGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
        uploaded.push(await uploadMediaFile(files[i]));
      }
      onChange([...tracks, ...uploaded]);
    } catch (err) {
      if (uploaded.length > 0) onChange([...tracks, ...uploaded]);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    if (!tracks.includes(url)) onChange([...tracks, url]);
    setUrlDraft("");
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {tracks.length > 0 && (
        <div className="mb-4 space-y-3">
          {tracks.map((src, index) => (
            <div key={`${src}-${index}`} className="flex items-center gap-3 border border-stone/40 bg-charcoal/40 p-3">
              <div className="min-w-0 flex-1">
                {isAudioUrl(src) ? (
                  <audio src={src} controls className="w-full" />
                ) : (
                  <a href={src} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-cream hover:text-accent">
                    {src}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(tracks.filter((_, i) => i !== index))}
                className="shrink-0 border border-red-400/60 px-3 py-1 text-xs text-red-400 hover:bg-red-400/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="admin-touch-btn w-full border border-dashed border-stone/50 bg-charcoal/30 text-sm text-fog hover:border-fog hover:text-cream disabled:opacity-50"
      >
        {uploading ? uploadProgress || "Uploading..." : "Upload audio (MP3, WAV, M4A, up to 100MB)"}
      </button>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlDraft}
          placeholder="Or paste a SoundCloud, Spotify, or MP3 URL"
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          className="flex-1"
        />
        <button type="button" onClick={addUrl} className="admin-touch-btn border border-stone/50 text-accent">
          Add URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}

export function SaveBar({
  onSave,
  saving,
  message,
  autosaveNote,
}: {
  onSave: () => void;
  saving: boolean;
  message?: string;
  autosaveNote?: string;
}) {
  const uploadsActive = useUploadsActive();
  const statusMessage = uploadsActive
    ? "Upload in progress. Saving is temporarily disabled."
    : saving
      ? "Saving changes…"
      : message || autosaveNote || "";

  return (
    <div className="sticky bottom-0 -mx-4 mt-8 flex flex-col gap-4 border-t border-stone/30 bg-ink/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:-mx-10 md:px-10">
      <div className="min-h-5 text-sm" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage && (
          <p className={message && !saving && !uploadsActive ? "text-accent" : "text-muted"}>
            {statusMessage}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (!uploadsActive) onSave();
        }}
        disabled={saving || uploadsActive}
        className="admin-touch-btn bg-cream tracking-[0.15em] text-ink uppercase disabled:opacity-50 sm:px-6"
      >
        {uploadsActive ? "Wait for uploads…" : saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
