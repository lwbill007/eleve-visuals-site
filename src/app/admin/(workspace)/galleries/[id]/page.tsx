"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkspaceChrome, WorkspaceError } from "@/components/admin/os/WorkspaceFrame";
import { adminFetch, adminJson } from "@/lib/admin-fetch";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import GalleryUploader from "@/components/admin/galleries/GalleryUploader";

type Photo = { id: string; filename: string; status: string; processingError: string };
type Detail = {
  gallery: {
    id: string;
    slug: string;
    title: string;
    clientName: string;
    clientEmail: string;
    sessionType: string;
    status: string;
    expiresAt: string | null;
    downloadEnabled: boolean;
    downloadQuality: string;
    allowDownloadOriginals: boolean;
    favoriteEnabled: boolean;
    commentsEnabled: boolean;
    photos: Photo[];
  };
  stats: {
    views: number;
    uniqueSessions: number;
    favorites: number;
    downloads: number;
    lastOpened: string | null;
    storage: Record<string, number> | null;
  };
};

export default function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await adminJson<Detail>(`/api/admin/galleries/${id}`));
    } catch {
      setError("Couldn't load this gallery.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/galleries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed.");
      if (json.accessCode) setNewCode(json.accessCode);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <AdminShell title="Gallery">
        <WorkspaceError message={error} onRetry={load} />
      </AdminShell>
    );
  }
  if (!data) {
    return (
      <AdminShell title="Gallery">
        <p className="p-8 font-body text-sm text-muted">Loading…</p>
      </AdminShell>
    );
  }

  const { gallery, stats } = data;
  const failed = gallery.photos.filter((p) => p.status === "failed");
  const url = typeof window !== "undefined" ? `${window.location.origin}/gallery/${gallery.slug}` : "";

  return (
    <AdminShell title={gallery.clientName || gallery.title}>
      <WorkspaceChrome
        eyebrow={osEyebrow("create", "What did the client receive?")}
        title={gallery.clientName || gallery.title}
        description={`${gallery.title}${gallery.sessionType ? ` · ${gallery.sessionType}` : ""} · ${gallery.status}`}
        onRefresh={load}
        extra={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/gallery/${gallery.slug}`}
              target="_blank"
              rel="noreferrer"
              className="border border-stone px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] text-cream transition-colors hover:border-accent hover:text-accent"
            >
              Preview as client
            </Link>
            {gallery.status === "published" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ status: "draft" })}
                className="border border-stone px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] text-cream transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ status: "published" })}
                className="border border-accent px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] text-accent transition-opacity hover:opacity-70 disabled:opacity-40"
              >
                Publish
              </button>
            )}
          </div>
        }
      >
        {error ? (
          <p role="alert" className="mb-6 border border-accent/40 px-4 py-3 font-body text-sm text-accent">
            {error}
          </p>
        ) : null}

        <section className="mb-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Photos" value={String(gallery.photos.length)} />
          <Stat label="Views" value={String(stats.views)} />
          <Stat label="Unique access" value={String(stats.uniqueSessions)} />
          <Stat label="Favourites" value={String(stats.favorites)} />
          <Stat label="Downloads" value={String(stats.downloads)} />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">Sharing</h2>
          <p className="break-all font-body text-sm text-cream">{url}</p>
          <p className="mt-3 font-body text-xs text-muted">
            {newCode ? (
              <>
                New access code:{" "}
                <span className="font-display text-lg tracking-[0.3em] text-accent">{newCode}</span> — shown
                once.
              </>
            ) : (
              "The access code is stored hashed and cannot be looked up. Regenerating issues a new one and signs every client out."
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ regenerateCode: true })}
              className="border border-stone px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] text-cream transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Regenerate code
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ revokeSessions: true })}
              className="border border-stone px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] text-cream transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Revoke all access
            </button>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">
            Storage
          </h2>
          {stats.storage ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(stats.storage).map(([variant, bytes]) => (
                <div key={variant}>
                  <dt className="font-body text-[0.55rem] uppercase tracking-[0.24em] text-stone">
                    {variant}
                  </dt>
                  <dd className="mt-1 font-body text-sm text-cream">{formatBytes(bytes)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            // Honest unknown rather than a plausible zero — the bucket is the
            // only authority on this number and it could not be reached.
            <p className="font-body text-sm text-muted">
              Unknown — storage could not be read. Check the R2 credentials.
            </p>
          )}
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">
            Add photographs
          </h2>
          <GalleryUploader galleryId={gallery.id} />
        </section>

        {failed.length > 0 ? (
          <section>
            <h2 className="mb-4 font-body text-[0.58rem] uppercase tracking-[0.28em] text-accent">
              {failed.length} failed to process
            </h2>
            <ul className="space-y-2">
              {failed.map((photo) => (
                <li key={photo.id} className="border border-stone/50 px-4 py-3">
                  <p className="font-body text-xs text-cream">{photo.filename}</p>
                  <p className="mt-1 font-body text-xs text-muted">{photo.processingError}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </WorkspaceChrome>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-[0.55rem] uppercase tracking-[0.24em] text-stone">{label}</p>
      <p className="mt-2 font-display text-2xl font-light text-cream">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
