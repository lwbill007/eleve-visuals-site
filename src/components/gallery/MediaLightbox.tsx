"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "./types";

export type LightboxItem = GalleryItem;

export function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNavigate?: (next: number) => void;
}) {
  const reduce = useReducedMotion();
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const canNavigate = !!onNavigate && items.length > 1;

  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null || !onNavigate) return;
      setZoomed(false);
      const next = (index + delta + items.length) % items.length;
      onNavigate(next);
    },
    [index, items.length, onNavigate]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, go]);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  // Preload adjacent images
  useEffect(() => {
    if (!open || index === null) return;
    const neighbors = [index - 1, index + 1]
      .map((i) => (i + items.length) % items.length)
      .filter((i) => items[i]?.type === "image");
    for (const i of neighbors) {
      const src = items[i]?.src;
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    }
  }, [open, index, items]);

  function handleTouchStart(e: React.TouchEvent) {
    if (!canNavigate || zoomed) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!canNavigate || !touchStart.current || zoomed) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx > 0 ? -1 : 1);
  }

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[100] flex flex-col bg-ink/96 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            {canNavigate ? (
              <p className="text-xs tracking-[0.15em] text-muted uppercase">
                {index + 1} / {items.length}
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {item.type === "image" && (
                <button
                  type="button"
                  onClick={() => setZoomed((z) => !z)}
                  className="flex h-10 min-w-10 items-center justify-center rounded-full border border-stone/40 px-3 text-xs text-fog hover:border-accent hover:text-cream"
                  aria-pressed={zoomed}
                >
                  {zoomed ? "Fit" : "Zoom"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone/40 text-xl text-fog hover:text-cream"
              >
                ×
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-12">
            {canNavigate && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Previous"
                  className="absolute top-1/2 left-1 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-stone/40 bg-ink/50 text-2xl text-fog backdrop-blur-sm hover:text-cream sm:flex"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Next"
                  className="absolute top-1/2 right-1 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-stone/40 bg-ink/50 text-2xl text-fog backdrop-blur-sm hover:text-cream sm:flex"
                >
                  ›
                </button>
              </>
            )}

            <motion.div
              key={`${item.type}-${item.src}`}
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative flex max-h-full w-full max-w-6xl items-center justify-center",
                zoomed && item.type === "image" && "overflow-auto"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === "image" ? (
                <div
                  className={cn(
                    "relative flex max-h-[calc(100dvh-7rem)] w-full items-center justify-center",
                    zoomed && "max-h-none"
                  )}
                >
                  <Image
                    src={item.src}
                    alt={item.alt || ""}
                    width={2400}
                    height={3000}
                    sizes="100vw"
                    className={cn(
                      "h-auto max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain transition-transform duration-300",
                      zoomed && "max-h-none scale-[1.35] cursor-grab active:cursor-grabbing sm:scale-150"
                    )}
                    style={{ width: "auto", height: "auto" }}
                    priority
                  />
                </div>
              ) : item.embed ? (
                <div className="relative aspect-video w-full max-w-5xl overflow-hidden bg-charcoal">
                  <iframe
                    src={item.embed}
                    title={item.alt || "Video"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={item.src}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[calc(100dvh-7rem)] w-full max-w-5xl bg-charcoal object-contain"
                />
              )}
            </motion.div>
          </div>

          {item.alt && (
            <p className="shrink-0 px-4 pb-3 text-center text-xs text-muted sm:pb-4">{item.alt}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
