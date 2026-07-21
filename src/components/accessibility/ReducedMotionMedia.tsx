"use client";

import { useEffect } from "react";

export function ReducedMotionMedia() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncVideos = () => {
      for (const video of document.querySelectorAll<HTMLVideoElement>("video[autoplay]")) {
        if (media.matches) {
          video.pause();
        } else if (video.muted) {
          void video.play().catch(() => {});
        }
      }
    };
    syncVideos();
    const observer = new MutationObserver(syncVideos);
    observer.observe(document.body, { childList: true, subtree: true });
    media.addEventListener("change", syncVideos);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncVideos);
    };
  }, []);

  return null;
}
