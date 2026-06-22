"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await adminFetch("/api/admin/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

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
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-stone/40 bg-ink">
        <div className="flex items-center justify-between border-b border-stone/30 px-6 py-4">
          <h3 className="font-display text-lg text-cream">Media Library</h3>
          <button type="button" onClick={onClose} className="text-sm text-fog hover:text-cream">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-center text-fog">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-fog">No media yet. Upload an image first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.url)}
                  className={cn(
                    "relative aspect-square overflow-hidden border bg-charcoal text-left",
                    picked.includes(item.url) ? "border-accent ring-1 ring-accent" : "border-stone/30"
                  )}
                >
                  <Image src={item.url} alt={item.alt || item.filename} fill className="object-cover" sizes="160px" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/80 px-2 py-1 text-[10px] text-cream">
                    {item.filename || "Untitled"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {multiple && (
          <div className="flex justify-end gap-3 border-t border-stone/30 px-6 py-4">
            <button type="button" onClick={onClose} className="text-sm text-fog">
              Cancel
            </button>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => {
                onSelect(picked);
                onClose();
              }}
              className="bg-cream px-4 py-2 text-xs text-ink disabled:opacity-50"
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
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border border-stone/50 px-3 py-1.5 text-xs text-fog hover:text-cream"
        >
          {uploading ? "Uploading..." : "Upload new"}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="border border-stone/50 px-3 py-1.5 text-xs text-accent"
        >
          Choose from library
        </button>
      </div>
      <div
        className={cn(
          "relative border border-dashed border-stone/50 bg-charcoal/30",
          value ? "aspect-video" : "flex min-h-[120px] items-center justify-center p-6"
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" sizes="400px" />
            <div className="absolute inset-0 flex items-end justify-end gap-2 bg-ink/40 p-3 opacity-0 transition-opacity hover:opacity-100">
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="bg-cream px-3 py-1.5 text-xs text-ink"
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="border border-stone px-3 py-1.5 text-xs text-cream"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="border border-stone px-3 py-1.5 text-xs text-cream"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">No image selected</p>
        )}
      </div>
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
  onCoverChange?: (url: string) => void;
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
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={cn(
                "relative aspect-square overflow-hidden bg-charcoal",
                coverImage === src && "ring-2 ring-accent"
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="160px" />
              <div className="absolute inset-0 flex flex-col items-end justify-end gap-1 bg-ink/50 p-2 opacity-0 transition-opacity hover:opacity-100">
                {onCoverChange && coverImage !== src && (
                  <button
                    type="button"
                    onClick={() => onCoverChange(src)}
                    className="w-full bg-cream px-2 py-1 text-[10px] text-ink"
                  >
                    Set cover
                  </button>
                )}
                {coverImage === src && (
                  <span className="w-full bg-accent/90 px-2 py-1 text-center text-[10px] text-ink">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="w-full border border-stone px-2 py-1 text-[10px] text-cream"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-[80px] flex-1 items-center justify-center border border-dashed border-stone/50 bg-charcoal/30 p-4 text-sm text-fog hover:border-fog hover:text-cream disabled:opacity-50"
        >
          {uploading ? uploadProgress || "Uploading..." : "Upload new images"}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="min-h-[80px] border border-dashed border-stone/50 bg-charcoal/30 px-6 text-sm text-accent hover:border-accent/50"
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
        <div key={`${label}-${index}`} className="flex gap-2">
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
            className="border border-stone/50 px-3 text-xs text-fog"
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
    <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-between border-t border-stone/30 bg-ink/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
      <div className="text-sm">
        {message && <p className="text-accent">{message}</p>}
        {autosaveNote && !message && <p className="text-muted">{autosaveNote}</p>}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-cream px-6 py-2.5 text-xs tracking-[0.15em] text-ink uppercase disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
