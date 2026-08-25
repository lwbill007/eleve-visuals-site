"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientPhoto } from "@/lib/gallery/service";
import FavoriteButton from "./FavoriteButton";

/**
 * Fullscreen viewing.
 *
 * Loads the display variant, not the original — an original is only ever
 * fetched by an explicit download. Keyboard, swipe and focus handling are all
 * first-class: the client on a phone and the client on a laptop get the same
 * gallery, and a keyboard user can leave without reaching for a mouse.
 */
export default function PhotoLightbox({
  photos,
  index,
  slug,
  favorites,
  favoriteEnabled,
  downloadEnabled,
  downloadQuality,
  allowOriginals,
  onClose,
  onNavigate,
  onToggleFavorite,
}: {
  photos: ClientPhoto[];
  index: number;
  slug: string;
  favorites: Set<string>;
  favoriteEnabled: boolean;
  downloadEnabled: boolean;
  downloadQuality: string;
  allowOriginals: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite: (photo: ClientPhoto) => void;
}) {
  const photo = photos[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onNavigate(next);
    },
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!photo) return null;

  // The neighbours are prefetched so paging feels instant rather than staged.
  const neighbours = [photos[index - 1], photos[index + 1]].filter(Boolean) as ClientPhoto[];

  const downloadTier = allowOriginals
    ? "original"
    : downloadQuality === "high"
      ? "large"
      : "display";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || photo.filename}
      className="fixed inset-0 z-50 flex flex-col bg-ink/98 backdrop-blur-sm"
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        // Horizontal intent only — a vertical swipe must not page the gallery.
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-5 sm:px-8">
        <p className="font-body text-[0.6rem] uppercase tracking-[0.3em] text-muted">
          {index + 1} / {photos.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-11 w-11 place-items-center text-cream/70 transition-colors hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2 sm:px-16">
        {index > 0 ? (
          <NavArrow direction="prev" onClick={() => go(-1)} />
        ) : null}

        <Image
          key={photo.id}
          src={photo.displayUrl}
          alt={photo.caption || ""}
          width={photo.width || 1800}
          height={photo.height || 1200}
          priority
          sizes="100vw"
          unoptimized
          className="max-h-full max-w-full object-contain"
          style={{ backgroundColor: photo.blurColor }}
        />

        {index < photos.length - 1 ? (
          <NavArrow direction="next" onClick={() => go(1)} />
        ) : null}
      </div>

      {/* Off-screen prefetch of the adjacent frames. */}
      <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        {neighbours.map((n) => (
          <Image key={n.id} src={n.displayUrl} alt="" width={16} height={16} unoptimized aria-hidden="true" />
        ))}
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-7">
        {favoriteEnabled ? (
          <FavoriteButton
            size="lg"
            active={favorites.has(photo.id)}
            label={photo.caption || photo.filename}
            onToggle={() => onToggleFavorite(photo)}
          />
        ) : null}

        {downloadEnabled ? (
          <a
            href={`/api/gallery/${encodeURIComponent(slug)}/photo/${photo.id}/download?tier=${downloadTier}`}
            // Not target=_blank: iOS Safari handles a same-tab redirect to a
            // Content-Disposition attachment correctly, and a popup is blocked.
            onClick={() => {
              setDownloading(true);
              window.setTimeout(() => setDownloading(false), 2500);
            }}
            className="border border-stone px-7 py-3 font-body text-[0.58rem] uppercase tracking-[0.32em] text-cream transition-colors duration-500 ease-[var(--ease-out-expo)] hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {downloading ? "Preparing" : "Download"}
          </a>
        ) : null}
      </div>

      {photo.caption ? (
        <p className="px-6 pb-8 text-center font-body text-xs tracking-wide text-muted">
          {photo.caption}
        </p>
      ) : null}
    </div>
  );
}

function NavArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const prev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? "Previous photograph" : "Next photograph"}
      className={`absolute ${prev ? "left-1 sm:left-4" : "right-1 sm:right-4"} grid h-14 w-14 place-items-center text-cream/50 transition-colors hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.2}>
        <path d={prev ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
