"use client";

import Image from "next/image";
import { isRenderableImageSrc } from "@/lib/image-url";
import { cn } from "@/lib/utils";

interface AdminPreviewImageProps {
  src: string;
  alt?: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
}

export function AdminPreviewImage({
  src,
  alt = "",
  fill,
  className,
  sizes = "200px",
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
      <Image src={src} alt={alt} fill className={className} sizes={sizes} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      className={className}
      sizes={sizes}
    />
  );
}
