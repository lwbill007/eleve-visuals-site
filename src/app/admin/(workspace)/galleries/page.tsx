"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkspaceChrome, WorkspaceEmpty, WorkspaceError } from "@/components/admin/os/WorkspaceFrame";
import { adminJson } from "@/lib/admin-fetch";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import GalleryCreateDialog from "@/components/admin/galleries/GalleryCreateDialog";

type GalleryRow = {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  sessionType: string;
  status: string;
  photoCount: number;
  favoriteCount: number;
  expiresAt: string | null;
  createdAt: string;
};

const STATUSES = ["", "draft", "published", "expired", "archived"] as const;

export default function GalleriesPage() {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      const data = await adminJson<{ galleries: GalleryRow[]; total: number }>(
        `/api/admin/galleries?${params}`
      );
      setRows(data.galleries);
      setTotal(data.total);
    } catch {
      setError("Couldn't load galleries.");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    // Debounced so typing in the search box doesn't fire a request per keystroke.
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <AdminShell title="Galleries">
      <WorkspaceChrome
        eyebrow={osEyebrow("create", "What did the client receive?")}
        title="Galleries"
        description="Private client delivery. Upload, set an access code, publish, and control what a client can download."
        onRefresh={load}
        refreshing={loading}
        extra={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="border border-stone px-5 py-2.5 font-body text-[0.6rem] uppercase tracking-[0.28em] text-cream transition-colors hover:border-accent hover:text-accent"
          >
            New gallery
          </button>
        }
      >
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, title or email"
            aria-label="Search galleries"
            className="min-w-[16rem] flex-1 border border-stone bg-transparent px-4 py-2.5 font-body text-sm text-cream outline-none transition-colors placeholder:text-stone focus-visible:border-accent"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="border border-stone bg-ink px-4 py-2.5 font-body text-sm text-cream outline-none focus-visible:border-accent"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <WorkspaceError message={error} onRetry={load} />
        ) : rows.length === 0 && !loading ? (
          <WorkspaceEmpty
            title="No galleries yet"
            detail="Create one to deliver a shoot to a client on your own domain."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone">
                  {["Client", "Gallery", "Status", "Photos", "Favourites", "Expires", "Created"].map(
                    (head) => (
                      <th
                        key={head}
                        scope="col"
                        className="whitespace-nowrap px-3 py-3 font-body text-[0.58rem] uppercase tracking-[0.24em] text-muted"
                      >
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-stone/40 transition-colors hover:bg-charcoal/40">
                    <td className="px-3 py-4 font-body text-sm text-cream">
                      <Link href={`/admin/galleries/${row.id}`} className="hover:text-accent">
                        {row.clientName || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-4 font-body text-sm text-muted">
                      {row.title}
                      {row.sessionType ? (
                        <span className="ml-2 text-xs text-stone">{row.sessionType}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-4 font-body text-sm text-muted">{row.photoCount}</td>
                    <td className="px-3 py-4 font-body text-sm text-muted">{row.favoriteCount}</td>
                    <td className="px-3 py-4 font-body text-sm text-muted">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-3 py-4 font-body text-sm text-muted">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-6 font-body text-[0.6rem] uppercase tracking-[0.24em] text-stone">
              {total} {total === 1 ? "gallery" : "galleries"}
            </p>
          </div>
        )}
      </WorkspaceChrome>

      {creating ? (
        <GalleryCreateDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-accent text-accent"
      : status === "draft"
        ? "border-stone text-muted"
        : "border-stone/60 text-stone";
  return (
    <span className={`border px-3 py-1 font-body text-[0.55rem] uppercase tracking-[0.24em] ${tone}`}>
      {status}
    </span>
  );
}
