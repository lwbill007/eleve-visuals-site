"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput } from "@/components/admin/AdminForm";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import { WorkspaceChrome, WorkspaceToolbar } from "@/components/admin/os/WorkspaceFrame";
import { adminFetch } from "@/lib/admin-fetch";
import { uploadMediaFile } from "@/lib/upload-client";
import { ADMIN_MEDIA_ACCEPT } from "@/lib/upload-constants";

interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  alt: string;
  createdAt: string;
}

function formatUploadProgress(progress: { percent: number; loaded: number; total: number }): string {
  if (progress.total > 0) {
    const mbLoaded = (progress.loaded / (1024 * 1024)).toFixed(1);
    const mbTotal = (progress.total / (1024 * 1024)).toFixed(1);
    return `${progress.percent}% · ${mbLoaded} / ${mbTotal} MB`;
  }
  return "Preparing upload...";
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    setMessageIsError(!res.ok);
    setMessage(res.ok ? "Deleted." : "Delete failed.");
    load();
  }

  async function saveMeta(id: string) {
    const res = await adminFetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: editName, alt: editAlt }),
    });
    setMessageIsError(!res.ok);
    setMessage(res.ok ? "Updated." : "Update failed.");
    setEditingId(null);
    load();
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setMessageIsError(false);
    setMessage("URL copied to clipboard.");
  }

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setUploadProgress(null);
    setMessageIsError(true);
    setMessage("Upload cancelled.");
  }

  async function handleUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    setMessage("");
    setMessageIsError(false);
    setUploadProgress({ percent: 0, label: `${file.name} — Connecting to storage…` });

    const controller = new AbortController();
    abortRef.current = controller;
    let maxPercent = 0;

    try {
      await uploadMediaFile(file, "/api/admin/upload", {
        signal: controller.signal,
        onProgress: (progress) => {
          maxPercent = Math.max(maxPercent, progress.percent);
          setUploadProgress({
            percent: maxPercent,
            label: `${file.name} — ${formatUploadProgress({ ...progress, percent: maxPercent })}`,
          });
        },
      });
      setUploadProgress({ percent: 100, label: "Upload complete" });
      setMessageIsError(false);
      setMessage("Uploaded successfully.");
      load();
    } catch (err) {
      console.error("Upload error:", err);
      setMessageIsError(true);
      setMessage(err instanceof Error ? err.message : "Upload failed.");
      setUploadProgress(null);
    } finally {
      abortRef.current = null;
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1200);
    }
  }

  return (
    <AdminShell title="Media Library">
      <WorkspaceChrome
        eyebrow="Make · Media"
        title="Media Library"
        description="What: centralized images and video for the whole site. Why: reuse assets without re-uploading. Next: upload or search, then attach from Portfolio or Homepage editors. AI can suggest alt text — you approve before saving."
        related={[
          { label: "Portfolio", href: "/admin/portfolio", desc: "Projects" },
          { label: "Homepage", href: "/admin/homepage", desc: "Hero & CTA" },
          { label: "Content hub", href: "/admin/content-hub", desc: "Drafts" },
        ]}
      >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="admin-touch-btn shrink-0 bg-cream tracking-wide text-ink uppercase disabled:opacity-50 sm:w-auto"
        >
          {uploading ? "Uploading..." : "Upload media"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ADMIN_MEDIA_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {uploadProgress && (
        <div
          className="mb-4 rounded border border-accent/30 bg-charcoal/60 p-4"
          role="progressbar"
          aria-valuenow={uploadProgress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 break-words text-fog">{uploadProgress.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-accent">{uploadProgress.percent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-stone/40">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(uploadProgress.percent, uploadProgress.percent > 0 ? 3 : 0)}%` }}
            />
          </div>
          {uploading && (
            <button
              type="button"
              onClick={cancelUpload}
              className="admin-touch-btn-compact mt-3 border border-stone/50 text-fog hover:border-red-400/60 hover:text-red-400"
            >
              Cancel upload
            </button>
          )}
        </div>
      )}

      <WorkspaceToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by filename, alt text, or URL..."
      />

      {message && (
        <p className={`mb-4 text-sm ${messageIsError ? "text-red-400" : "text-accent"}`}>{message}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="border border-stone/30 bg-charcoal/20">
            <div className="relative aspect-square bg-ink">
              {item.url.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) ? (
                <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <AdminPreviewImage src={item.url} alt={item.alt || item.filename} fill className="object-cover" sizes="200px" />
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => copyUrl(item.url)}
                  className="admin-touch-btn border border-accent/40 text-accent sm:w-auto"
                >
                  Copy URL
                </button>
                {editingId === item.id ? (
                  <button
                    type="button"
                    onClick={() => saveMeta(item.id)}
                    className="admin-touch-btn border border-stone/40 text-fog sm:w-auto"
                  >
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
                    className="admin-touch-btn border border-stone/40 text-fog sm:w-auto"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="admin-touch-btn border border-red-400/40 text-red-400 sm:w-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-fog">
          {search ? "No media matches your search." : "No media yet. Upload images or videos from any admin editor."}
        </p>
      )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
