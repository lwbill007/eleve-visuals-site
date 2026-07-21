"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput } from "@/components/admin/AdminForm";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import { WorkspaceChrome, WorkspaceToolbar, WorkspaceError, WorkspaceEmpty } from "@/components/admin/os/WorkspaceFrame";
import { adminFetch } from "@/lib/admin-fetch";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import { uploadMediaFile } from "@/lib/upload-client";
import { ADMIN_MEDIA_ACCEPT } from "@/lib/upload-constants";
import { confirmNamedDestructive } from "@/lib/admin-confirm";

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
  const [loadError, setLoadError] = useState("");
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
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await adminFetch(`/api/admin/media${qs}`);
      if (!res.ok) {
        setLoadError(`Could not load media (${res.status}).`);
        return;
      }
      setLoadError("");
      setItems(await res.json());
    } catch {
      setLoadError("Could not load media.");
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function remove(item: MediaAsset) {
    if (!confirmNamedDestructive("media asset", item.filename || item.url)) return;
    const res = await adminFetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    setMessageIsError(!res.ok);
    setMessage(res.ok ? "Deleted." : body?.error || "Delete failed.");
    if (res.ok) load();
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

  const hasAssets = items.length > 0;
  const damCapabilities: OsCapability[] = useMemo(() => {
    const owner = METRIC_OWNERS.analytics;
    return [
      {
        id: "library",
        label: "Asset library",
        status: hasAssets ? "live" : "planned",
        summary: hasAssets
          ? `${items.length} asset${items.length === 1 ? "" : "s"} searchable in the library.`
          : "Upload media to populate the DAM library.",
        missing: hasAssets
          ? undefined
          : {
              label: "Asset library",
              reason: "No media assets indexed yet",
              required: ["Upload via Media or any editor"],
              confidence: 0,
              unlockAfter: "Unlock after first upload",
              owner,
              unlockHref: "/admin/media",
            },
      },
      {
        id: "search",
        label: "Search",
        status: "live",
        summary: "Filename / alt search is live on this library.",
      },
      {
        id: "versions",
        label: "Versions",
        status: "planned",
        summary: "Version history per asset is not modeled yet.",
        missing: {
          label: "Versions",
          reason: "No asset version graph",
          required: ["Version entity", "Replace / restore flow"],
          confidence: 0,
          unlockAfter: "Unlock after DAM versioning",
          owner,
          unlockHref: "/admin/qa",
        },
      },
      {
        id: "cloudinary",
        label: "Cloudinary",
        status: "partial",
        summary: "Uploads use configured storage. Full Cloudinary DAM sync (folders, transforms) is partial.",
        missing: {
          label: "Cloudinary DAM sync",
          reason: "Folder sync + transform presets not a first-class OS surface",
          required: ["Cloudinary connector health", "Folder mirror", "Transform presets"],
          confidence: 0,
          unlockAfter: "Unlock after Cloudinary DAM connector",
          owner,
          unlockHref: "/admin/qa",
        },
      },
      {
        id: "usage",
        label: "Usage / where used",
        status: "planned",
        summary: "Cross-page usage graph (portfolio, homepage, sessions) is not indexed yet.",
        missing: {
          label: "Asset usage",
          reason: "No reverse index of where each asset is attached",
          required: ["Usage index across CMS entities"],
          confidence: 0,
          unlockAfter: "Unlock after asset usage indexing",
          owner,
          unlockHref: "/admin/qa",
        },
      },
      {
        id: "metadata",
        label: "Metadata",
        status: hasAssets ? "partial" : "planned",
        summary: hasAssets
          ? "Filename + alt are editable. Tags, rights, and expiry are not."
          : "Metadata editing unlocks after assets exist.",
        missing: {
          label: "Rich metadata",
          reason: "Tags, rights, and license fields missing",
          required: ["Tag taxonomy", "Rights / license fields"],
          confidence: 0,
          unlockAfter: "Unlock after metadata schema expansion",
          owner,
          unlockHref: "/admin/qa",
        },
      },
    ];
  }, [hasAssets, items.length]);

  return (
    <AdminShell title="Media">
      <WorkspaceChrome
        eyebrow={osEyebrow("create", "Where is the asset?")}
        title="Media"
        description="Professional DAM — search, versions, Cloudinary. Search and upload are live; versions and usage stay MissingMetric until connected."
        related={[
          { label: "Portfolio", href: "/admin/portfolio", desc: "Which work drives business?" },
          { label: "Homepage Intelligence", href: "/admin/homepage", desc: "Is the homepage converting?" },
          { label: "Sessions", href: "/admin/sessions-hub", desc: "How do we produce the shoot?" },
          { label: "Executive QA", href: "/admin/qa", desc: "What is broken or incomplete?" },
        ]}
      >
      <OsCapabilityGrid
        className="mb-8"
        title="DAM capabilities"
        subtitle="Always show what is live vs MissingMetric — never invent DAM readiness."
        capabilities={damCapabilities}
      />
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
                  onClick={() => remove(item)}
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
        loadError ? (
          <WorkspaceError message={loadError} onRetry={() => void load()} />
        ) : (
          <WorkspaceEmpty
            title={search ? "No media matches" : "No media yet"}
            detail={
              search
                ? "Try a different search."
                : "Upload images or videos from any admin editor."
            }
          />
        )
      )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
