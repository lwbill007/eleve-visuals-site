"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { galleryImageSizes } from "@/lib/gallery-utils";

export function GalleryImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  onClick,
  interactive = true,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const Wrapper = interactive ? "button" : "div";
  const wrapperProps = interactive
    ? ({
        type: "button" as const,
        onClick,
        "aria-label": alt || "View image",
      })
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group relative block w-full min-w-0 overflow-hidden bg-ink/20 text-left",
        interactive && "cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={2000}
        sizes={sizes ?? galleryImageSizes("standard")}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        className={cn(
          "relative h-auto w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          interactive && "sm:group-hover:scale-[1.008]"
        )}
        style={{ width: "100%", height: "auto" }}
      />

      {interactive && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10"
            aria-hidden
          />
          <div className="grain pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        </>
      )}
    </Wrapper>
  );
}
