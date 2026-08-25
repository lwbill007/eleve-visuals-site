"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientGallery, ClientPhoto } from "@/lib/gallery/service";
import PhotoGrid from "./PhotoGrid";
import PhotoLightbox from "./PhotoLightbox";

type Filter = "all" | "favorites";

/**
 * The client's whole experience. State lives here — filter, section, lightbox
 * index, favourites — so the grid and the lightbox always agree about what is
 * being shown and which photo is "current" when the lightbox opens.
 */
export default function ClientGalleryView({
  gallery,
  slug,
}: {
  gallery: ClientGallery;
  slug: string;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(gallery.photos.filter((p) => p.isFavorite).map((p) => p.id))
  );
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = useMemo(() => {
    let photos = gallery.photos;
    if (sectionId) photos = photos.filter((p) => p.sectionId === sectionId);
    if (filter === "favorites") photos = photos.filter((p) => favorites.has(p.id));
    return photos;
  }, [gallery.photos, sectionId, filter, favorites]);

  const toggleFavorite = useCallback(
    async (photo: ClientPhoto) => {
      const next = !favorites.has(photo.id);
      // Optimistic: a heart that waits on a round trip feels broken on mobile.
      setFavorites((current) => {
        const copy = new Set(current);
        if (next) copy.add(photo.id);
        else copy.delete(photo.id);
        return copy;
      });
      try {
        const res = await fetch(`/api/gallery/${encodeURIComponent(slug)}/favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id, favorite: next }),
        });
        if (!res.ok) throw new Error("failed");
      } catch {
        // Roll back rather than leaving a heart that lies about what was saved.
        setFavorites((current) => {
          const copy = new Set(current);
          if (next) copy.delete(photo.id);
          else copy.add(photo.id);
          return copy;
        });
      }
    },
    [favorites, slug]
  );

  // Body scroll lock while the lightbox is open, restored exactly as found.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightboxIndex]);

  const favoriteCount = favorites.size;

  return (
    <main className="min-h-screen bg-ink pb-32">
      <header className="px-6 pt-24 pb-16 text-center sm:pt-32 sm:pb-24">
        <p className="font-body text-[0.6rem] uppercase tracking-[0.42em] text-accent">
          ÉLEVÉ
        </p>
        <h1 className="mt-8 font-display text-4xl font-light tracking-[0.06em] text-cream sm:text-6xl">
          {gallery.clientName || gallery.title}
        </h1>
        {gallery.sessionType ? (
          <p className="mt-5 font-body text-[0.62rem] uppercase tracking-[0.36em] text-muted">
            {gallery.sessionType}
          </p>
        ) : null}
        <p className="mt-8 font-body text-[0.62rem] uppercase tracking-[0.3em] text-fog">
          {gallery.photoCount} {gallery.photoCount === 1 ? "photograph" : "photographs"}
          {gallery.favoriteEnabled && favoriteCount > 0
            ? ` · ${favoriteCount} favourite${favoriteCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {gallery.description ? (
          <p className="mx-auto mt-10 max-w-xl font-body text-sm leading-relaxed text-muted">
            {gallery.description}
          </p>
        ) : null}
      </header>

      {(gallery.sections.length > 0 || gallery.favoriteEnabled) && (
        <nav
          aria-label="Gallery sections"
          className="mb-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6"
        >
          <SectionTab
            active={sectionId === null && filter === "all"}
            onClick={() => {
              setSectionId(null);
              setFilter("all");
            }}
          >
            All
          </SectionTab>

          {gallery.sections
            .filter((s) => s.count > 0)
            .map((section) => (
              <SectionTab
                key={section.id}
                active={sectionId === section.id && filter === "all"}
                onClick={() => {
                  setSectionId(section.id);
                  setFilter("all");
                }}
              >
                {section.title}
              </SectionTab>
            ))}

          {gallery.favoriteEnabled ? (
            <SectionTab
              active={filter === "favorites"}
              onClick={() => {
                setFilter("favorites");
                setSectionId(null);
              }}
            >
              Favourites{favoriteCount > 0 ? ` (${favoriteCount})` : ""}
            </SectionTab>
          ) : null}
        </nav>
      )}

      {visible.length === 0 ? (
        <p className="px-6 py-24 text-center font-body text-sm text-muted">
          {filter === "favorites"
            ? "Tap the heart on a photograph to gather your favourites here."
            : "Nothing in this section yet."}
        </p>
      ) : (
        <PhotoGrid
          photos={visible}
          favorites={favorites}
          favoriteEnabled={gallery.favoriteEnabled}
          onOpen={(index) => setLightboxIndex(index)}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {lightboxIndex !== null && visible[lightboxIndex] ? (
        <PhotoLightbox
          photos={visible}
          index={lightboxIndex}
          slug={slug}
          favorites={favorites}
          favoriteEnabled={gallery.favoriteEnabled}
          downloadEnabled={gallery.downloadEnabled}
          downloadQuality={gallery.downloadQuality}
          allowOriginals={gallery.allowDownloadOriginals}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
    </main>
  );
}

function SectionTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`border-b pb-1 font-body text-[0.6rem] uppercase tracking-[0.3em] transition-colors duration-500 ease-[var(--ease-out-expo)] ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-muted hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}
