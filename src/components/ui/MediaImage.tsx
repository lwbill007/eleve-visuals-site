import Image from "next/image";
import { cn } from "@/lib/utils";

interface MediaImageProps {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
  aspectRatio?: string;
  sizes?: string;
  fill?: boolean;
}

export function MediaImage({
  src,
  alt,
  className,
  priority,
  overlay = false,
  aspectRatio,
  sizes = "100vw",
  fill = true,
}: MediaImageProps) {
  return (
    <div
      className={cn("relative overflow-hidden bg-charcoal", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-700 hover:scale-[1.02]"
          style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink-soft to-ink" />
      )}
      {overlay && <div className="cinematic-overlay absolute inset-0" />}
    </div>
  );
}
