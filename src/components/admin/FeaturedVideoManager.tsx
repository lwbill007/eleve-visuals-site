"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import {
  collectVolumeVideoSources,
  type VolumeVideoRow,
  type VolumeVideoSource,
} from "@/lib/volume-videos";

interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  createdAt: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatUploadDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function sourceLabel(source: VolumeVideoSource): string {
  switch (source) {
    case "videos":
      return "Videos";
    case "interviews":
      return "Interviews";
    case "teaser":
      return "Official Trailer";
  }
}

function VideoDuration({ url }: { url: string }) {
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    setDuration(null);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    const onMeta = () => setDuration(formatDuration(video.duration));
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", () => setDuration("—"));
    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.src = "";
    };
  }, [url]);

  return <span className="text-fog">{duration ?? "…"}</span>;
}

function VideoPreviewModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/90 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col border border-stone/40 bg-ink sm:max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-stone/30 px-4 py-3 sm:px-6">
          <h3 className="truncate font-display text-base text-cream sm:text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="admin-touch-btn-compact min-w-16 border border-stone/40 text-fog hover:text-cream"
          >
            Close
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <video src={url} controls playsInline className="max-h-[70vh] w-full bg-black" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedVideoManager({
  volumeId,
  videos,
  interviews,
  teaserVideoUrl,
  featuredMediaId,
  onFeaturedChange,
  onVideosChange,
  onInterviewsChange,
  onTeaserChange,
}: {
  volumeId: string;
  videos: string[];
  interviews: string[];
  teaserVideoUrl: string | null;
  featuredMediaId: string | null;
  onFeaturedChange: (mediaId: string | null, featuredVideoUrl: string | null) => void;
  onVideosChange: (videos: string[]) => void;
  onInterviewsChange: (interviews: string[]) => void;
  onTeaserChange: (url: string | null) => void;
}) {
  const [rows, setRows] = useState<VolumeVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<VolumeVideoRow | null>(null);
  const [message, setMessage] = useState("");

  const sourceLists = useMemo(
    () => ({ videos, interviews, teaserVideoUrl }),
    [videos, interviews, teaserVideoUrl]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const base = collectVolumeVideoSources(sourceLists);
      if (base.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const res = await adminFetch("/api/admin/media");
      const assets: MediaAsset[] = res.ok ? await res.json() : [];
      const urlSet = new Set(base.map((r) => r.url));
      const matched = assets.filter((a) => urlSet.has(a.url));

      const merged = base.map((row) => {
        const asset = matched.find((a) => a.url === row.url);
        if (!asset) return row;
        return {
          ...row,
          mediaId: asset.id,
          title: asset.filename?.trim() || row.title,
          uploadedAt: asset.createdAt,
        };
      });

      if (!cancelled) {
        setRows(merged);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceLists]);

  async function setFeatured(row: VolumeVideoRow) {
    if (!row.mediaId || !row.isDirectFile) return;
    setBusyUrl(row.url);
    setMessage("");
    const res = await adminFetch(`/api/admin/session-volumes/${volumeId}/featured-video`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId: row.mediaId }),
    });
    setBusyUrl(null);
    if (!res.ok) {
      setMessage("Could not set featured video.");
      return;
    }
    const updated = await res.json();
    onFeaturedChange(updated.featuredMediaId ?? null, updated.featuredVideoUrl ?? null);
    setMessage("Featured video updated.");
  }

  async function removeVideo(row: VolumeVideoRow) {
    if (!confirm(`Remove "${row.title}" from this Volume?`)) return;
    setBusyUrl(row.url);
    setMessage("");
    const res = await adminFetch(`/api/admin/session-volumes/${volumeId}/volume-video`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: row.url }),
    });
    setBusyUrl(null);
    if (!res.ok) {
      setMessage("Could not remove video.");
      return;
    }
    const updated = await res.json();
    onVideosChange(updated.videos ?? []);
    onInterviewsChange(updated.interviews ?? []);
    onTeaserChange(updated.teaserVideoUrl ?? null);
    onFeaturedChange(updated.featuredMediaId ?? null, updated.featuredVideoUrl ?? null);
    setMessage("Video removed.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-cream">Featured Video</h3>
        <p className="mt-1 text-sm text-fog">
          Choose one uploaded video as the cinematic hero for this Volume. Only direct file uploads (MP4, WebM, MOV)
          can be featured — embed links stay in the gallery below.
        </p>
      </div>

      {message && <p className="text-sm text-accent">{message}</p>}

      {loading ? (
        <p className="text-sm text-fog">Loading videos…</p>
      ) : rows.length === 0 ? (
        <p className="rounded border border-stone/30 bg-ink-soft/40 px-4 py-6 text-sm text-fog">
          No videos uploaded yet. Add videos in the sections above, then pick one here.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const isFeatured = !!row.mediaId && row.mediaId === featuredMediaId;
            const isBusy = busyUrl === row.url;

            return (
              <li
                key={row.url}
                className={`flex flex-col gap-4 rounded border p-4 sm:flex-row sm:items-center ${
                  isFeatured ? "border-accent/60 bg-accent/5" : "border-stone/30 bg-ink-soft/20"
                }`}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded bg-black sm:w-40">
                  <video
                    src={row.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-cream">{row.title}</p>
                    {isFeatured && (
                      <span className="rounded bg-accent px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.15em] text-ink uppercase">
                        FEATURED
                      </span>
                    )}
                    <span className="text-[0.65rem] tracking-[0.12em] text-fog uppercase">
                      {sourceLabel(row.source)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fog">
                    <span>
                      Duration: <VideoDuration url={row.url} />
                    </span>
                    <span>Uploaded: {formatUploadDate(row.uploadedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                  <button
                    type="button"
                    onClick={() => setPreview(row)}
                    className="admin-touch-btn-compact border border-stone/40 text-fog hover:border-cream/40 hover:text-cream"
                  >
                    ▶ Preview
                  </button>
                  <button
                    type="button"
                    disabled={!row.isDirectFile || !row.mediaId || isFeatured || isBusy}
                    onClick={() => setFeatured(row)}
                    className="admin-touch-btn-compact border border-stone/40 text-fog hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      !row.isDirectFile
                        ? "Embed links cannot be used as the hero video"
                        : !row.mediaId
                          ? "Video must be indexed in the media library"
                          : undefined
                    }
                  >
                    {isBusy ? "Saving…" : "⭐ Set as Featured"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => removeVideo(row)}
                    className="admin-touch-btn-compact border border-stone/40 text-fog hover:border-red-400/60 hover:text-red-300"
                  >
                    🗑 Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview && (
        <VideoPreviewModal url={preview.url} title={preview.title} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
