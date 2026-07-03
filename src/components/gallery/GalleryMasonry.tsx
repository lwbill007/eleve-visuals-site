"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { galleryImageSizes, masonryColumnClass } from "@/lib/gallery-utils";
import { GalleryImage } from "./GalleryImage";
import { GalleryVideoTile } from "./GalleryVideoTile";
import { MediaLightbox } from "./MediaLightbox";
import type { GalleryMasonryProps } from "./types";

export function GalleryMasonry({
  items,
  label,
  title,
  subtitle,
  showCount = true,
  tone = "default",
  id,
  columns = "standard",
  variant = "section",
}: GalleryMasonryProps) {
  const [index, setIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const columnClass = masonryColumnClass(columns);
  const sizes = galleryImageSizes(columns);

  const grid = (
    <div className={cn("min-w-0", columnClass)}>
      {items.map((item, i) => (
        <motion.div
          key={`${item.type}-${item.src}-${i}`}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-32px" }}
          transition={{ duration: 0.5, delay: Math.min((i % 8) * 0.04, 0.28) }}
          className="mb-3 break-inside-avoid md:mb-4"
        >
          {item.type === "video" ? (
            <GalleryVideoTile item={item} onClick={() => setIndex(i)} />
          ) : (
            <GalleryImage
              src={item.src}
              alt={item.alt || ""}
              sizes={sizes}
              priority={i < 2}
              onClick={() => setIndex(i)}
            />
          )}
        </motion.div>
      ))}
    </div>
  );

  const lightbox = (
    <MediaLightbox items={items} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
  );

  if (variant === "embedded") {
    return (
      <>
        {grid}
        {lightbox}
      </>
    );
  }

  return (
    <section
      id={id}
      className={cn(
        "section-padding overflow-x-clip border-b border-stone/30",
        tone === "soft" && "bg-ink-soft"
      )}
    >
      <div className="container-wide min-w-0">
        {(label || title || subtitle) && (
          <header className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              {label && <p className="label-caps text-fog">{label}</p>}
              {title && (
                <h2 className={cn("text-balance", label ? "headline-md mt-2" : "headline-md")}>
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p>}
            </div>
            {showCount && (
              <p className="shrink-0 text-xs text-muted">
                {items.length} frame{items.length === 1 ? "" : "s"}
              </p>
            )}
          </header>
        )}

        {grid}
      </div>
      {lightbox}
    </section>
  );
}
