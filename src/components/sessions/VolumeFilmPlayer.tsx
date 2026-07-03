"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toVideoEmbed } from "@/lib/video-embed";

export function VolumeFilmPlayer({
  url,
  title,
  poster,
  open,
  onClose,
}: {
  url: string | null;
  title: string;
  poster?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const embed = url ? toVideoEmbed(url) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !videoRef.current || embed) return;
    videoRef.current.play().catch(() => {});
  }, [open, embed, url]);

  if (!url) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.35 }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 bg-ink/50 text-cream backdrop-blur-sm transition-colors hover:border-cream"
          >
            ✕
          </button>

          <div className="relative h-full w-full max-h-[100dvh] max-w-[100vw]">
            {embed ? (
              <iframe
                src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
                title={title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                ref={videoRef}
                src={url}
                poster={poster || undefined}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
