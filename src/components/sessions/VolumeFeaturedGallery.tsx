"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GalleryImage } from "@/components/gallery/GalleryImage";
import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import { MediaLightbox } from "@/components/gallery/MediaLightbox";
import type { GalleryItem } from "@/components/gallery/types";

const FEATURED_COUNT = 6;

export function VolumeFeaturedGallery({
  title,
  volumeTitle,
  items,
}: {
  title: string;
  volumeTitle: string;
  items: GalleryItem[];
}) {
  const reduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const featured = items.slice(0, FEATURED_COUNT);
  const hasMore = items.length > FEATURED_COUNT;

  return (
    <>
      <section id="gallery" className="section-padding overflow-x-clip border-b border-stone/30">
        <div className="container-wide min-w-0">
          <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="label-caps text-accent">Still Frames</p>
              <h2 className="headline-md mt-2 text-balance">Featured Frames</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Selected moments from {volumeTitle}.
              </p>
            </div>
            {hasMore && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="shrink-0 border border-stone/40 px-6 py-3 text-xs tracking-[0.18em] text-cream uppercase transition-colors hover:border-accent hover:text-accent"
              >
                View All Photos
              </button>
            )}
          </header>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {featured.map((item, i) => (
              <motion.div
                key={`${item.src}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.25) }}
                className={i === 0 ? "col-span-2 row-span-2 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2" : ""}
              >
                <GalleryImage
                  src={item.src}
                  alt={item.alt || ""}
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 40vw" : "(max-width: 768px) 50vw, 20vw"}
                  priority={i < 2}
                  onClick={() => setLightboxIndex(i)}
                />
              </motion.div>
            ))}
          </div>

          {hasMore && !showAll && (
            <div className="mt-8 text-center sm:hidden">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="border border-stone/40 px-8 py-3 text-xs tracking-[0.18em] text-cream uppercase"
              >
                View All Photos
              </button>
            </div>
          )}
        </div>
      </section>

      <MediaLightbox
        items={items}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      {showAll && (
        <GalleryMasonry
          id="gallery-full"
          items={items}
          label="Full Gallery"
          title={title}
          subtitle="Every frame from the production."
          columns="standard"
          showCount
        />
      )}
    </>
  );
}
