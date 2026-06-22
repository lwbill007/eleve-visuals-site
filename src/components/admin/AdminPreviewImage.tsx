"use client";

import { isRenderableImageSrc } from "@/lib/image-url";
import { cn } from "@/lib/utils";

interface AdminPreviewImageProps {
  src: string;
  alt?: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
}

/** Admin-only preview — native img avoids next/image URL parsing errors on Blob URLs. */
export function AdminPreviewImage({
  src,
  alt = "",
  fill,
  className,
}: AdminPreviewImageProps) {
  if (!isRenderableImageSrc(src)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-charcoal p-3 text-center text-xs text-red-300",
          fill && "absolute inset-0",
          className
        )}
      >
        Invalid image URL
      </div>
    );
  }

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("h-auto max-w-full", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
