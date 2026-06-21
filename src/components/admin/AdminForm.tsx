"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm text-cream-dim">{label}</p>}
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
                onClick={() => inputRef.current?.click()}
                className="bg-cream px-3 py-1.5 text-xs text-ink"
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-fog hover:text-cream"
          >
            {uploading ? "Uploading..." : "Click to upload image"}
          </button>
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
}: {
  onSave: () => void;
  saving: boolean;
  message?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-between border-t border-stone/30 bg-ink/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
      <p className="text-sm text-accent">{message}</p>
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
