"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";
import { uploadImageFile, uploadMediaFile } from "@/lib/upload-client";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import { isVideoUrl } from "@/lib/image-url";

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

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setLoading(true);
    adminFetch("/api/admin/media")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const visibleItems = imagesOnly ? items.filter((item) => !isVideoUrl(item.url)) : items;

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/90 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col border border-stone/40 bg-ink sm:max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-stone/30 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="font-display text-base text-cream sm:text-lg">Media Library</h3>
          <button
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
}

export function AdminField({ label, children, hint }: AdminFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-cream-dim">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
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
      onChange([...videos, ...uploaded]);
    } catch (err) {
      if (uploaded.length > 0) onChange([...videos, ...uploaded]);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function addUrl() {
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
                  <video src={src} controls className="h-full w-full object-cover" />
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
        {uploading ? uploadProgress || "Uploading..." : "Upload video (MP4 or WebM, max 50MB)"}
      </button>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlDraft}
          placeholder="Or paste a YouTube, Vimeo, or MP4 URL"
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          className="flex-1"
        />
        <button
          type="button"
          onClick={addUrl}
          className="admin-touch-btn border border-stone/50 text-accent"
        >
          Add URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
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
  return (
    <div className="sticky bottom-0 -mx-4 mt-8 flex flex-col gap-4 border-t border-stone/30 bg-ink/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:-mx-10 md:px-10">
      <div className="text-sm">
        {message && <p className="text-accent">{message}</p>}
        {autosaveNote && !message && <p className="text-muted">{autosaveNote}</p>}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="admin-touch-btn bg-cream tracking-[0.15em] text-ink uppercase disabled:opacity-50 sm:px-6"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
