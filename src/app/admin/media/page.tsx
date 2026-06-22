"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput } from "@/components/admin/AdminForm";
import { adminFetch } from "@/lib/admin-fetch";

interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  alt: string;
  createdAt: string;
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await adminFetch(`/api/admin/media${qs}`);
    if (res.ok) setItems(await res.json());
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function remove(id: string) {
    if (!confirm("Delete this media asset from the library?")) return;
    const res = await adminFetch(`/api/admin/media/${id}`, { method: "DELETE" });
    setMessage(res.ok ? "Deleted." : "Delete failed.");
    load();
  }

  async function saveMeta(id: string) {
    const res = await adminFetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: editName, alt: editAlt }),
    });
    setMessage(res.ok ? "Updated." : "Update failed.");
    setEditingId(null);
    load();
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setMessage("URL copied to clipboard.");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await adminFetch("/api/admin/upload", { method: "POST", body: formData });
    setUploading(false);
    setMessage(res.ok ? "Uploaded." : "Upload failed.");
    load();
  }

  return (
    <AdminShell title="Media Library">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-fog">
          Centralized media for the entire site. Upload here or from any image field — all assets
          are indexed for reuse.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-cream px-4 py-2 text-xs tracking-wide text-ink uppercase disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by filename, alt text, or URL..."
        className="mb-4 w-full max-w-md border border-stone/50 bg-charcoal px-4 py-2.5 text-sm text-cream"
        aria-label="Search media"
      />

      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="border border-stone/30 bg-charcoal/20">
            <div className="relative aspect-square bg-ink">
              {item.url.match(/\.(mp4|webm)(\?|$)/i) ? (
                <video src={item.url} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <Image src={item.url} alt={item.alt || item.filename} fill className="object-cover" sizes="200px" />
              )}
            </div>
            <div className="space-y-2 p-3">
              {editingId === item.id ? (
                <>
                  <AdminField label="Filename">
                    <AdminInput value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </AdminField>
                  <AdminField label="Alt text">
                    <AdminInput value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
                  </AdminField>
                </>
              ) : (
                <>
                  <p className="truncate text-xs text-cream">{item.filename || "Untitled"}</p>
                  {item.alt && <p className="truncate text-[0.65rem] text-muted">Alt: {item.alt}</p>}
                </>
              )}
              <p className="truncate text-[0.65rem] text-muted">{item.url}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyUrl(item.url)}
                  className="text-xs text-accent"
                >
                  Copy URL
                </button>
                {editingId === item.id ? (
                  <button type="button" onClick={() => saveMeta(item.id)} className="text-xs text-fog">
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.filename);
                      setEditAlt(item.alt);
                    }}
                    className="text-xs text-fog"
                  >
                    Edit
                  </button>
                )}
                <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-400">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-fog">
          {search ? "No media matches your search." : "No media yet. Upload images from any admin editor."}
        </p>
      )}
    </AdminShell>
  );
}
