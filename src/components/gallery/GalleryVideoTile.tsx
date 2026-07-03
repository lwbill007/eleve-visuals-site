"use client";

import { cn } from "@/lib/utils";
import type { GalleryItem } from "./types";

export function GalleryVideoTile({
  item,
  onClick,
  className,
}: {
  item: GalleryItem;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.alt || "Play video"}
      className={cn(
        "group relative block w-full min-w-0 overflow-hidden bg-charcoal text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className
      )}
    >
      <div className="relative aspect-video w-full bg-ink">
        {item.embed ? (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink" />
        ) : item.src ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={item.src}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/35 transition-colors group-hover:bg-ink/20">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cream/50 bg-ink/50 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 sm:h-14 sm:w-14">
            <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-cream sm:border-y-8 sm:border-l-[13px]" />
          </span>
        </span>
      </div>
      {item.alt && (
        <p className="px-3 py-2 text-[0.65rem] tracking-wide text-muted">{item.alt}</p>
      )}
    </button>
  );
}
