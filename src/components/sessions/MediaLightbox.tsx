"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

export interface LightboxItem {
  type: "image" | "video";
  src: string;
  embed?: string | null;
  alt?: string;
}

export function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onNavigate?: (next: number) => void;
}) {
  const open = index !== null && index >= 0 && index < items.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null || !onNavigate) return;
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

  const item = open ? items[index] : null;
  const canNavigate = !!onNavigate && items.length > 1;

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 flex h-11 w-11 items-center justify-center text-2xl text-fog transition-colors hover:text-cream"
          >
            ×
          </button>

          {canNavigate && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous"
                className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center text-2xl text-fog transition-colors hover:text-cream md:left-6"
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
                className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center text-2xl text-fog transition-colors hover:text-cream md:right-6"
              >
                ›
              </button>
            </>
          )}

          <motion.div
            key={item.src}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[88vh] w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {item.type === "image" ? (
              <div className="relative h-[80vh] w-full">
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            ) : item.embed ? (
              <div className="relative aspect-video w-full overflow-hidden bg-charcoal">
                <iframe
                  src={item.embed}
                  title={item.alt || "Video"}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                src={item.src}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] w-full bg-charcoal"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
