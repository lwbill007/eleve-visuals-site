"use client";

import Image from "next/image";
import type { ClientPhoto } from "@/lib/gallery/service";
import { imageOrientation, skeletonAspectForOrientation } from "@/lib/gallery-utils";
import FavoriteButton from "./FavoriteButton";

/**
 * The grid.
 *
 * Thumbnails only — never a display or original file. Each tile reserves its
 * real aspect ratio up front from the stored dimensions, so nothing shifts as
 * images arrive, and paints the photo's own averaged colour underneath so a
 * slow connection sees a dark plate rather than a white flash.
 */
export default function PhotoGrid({
  photos,
  favorites,
  favoriteEnabled,
  onOpen,
  onToggleFavorite,
}: {
  photos: ClientPhoto[];
  favorites: Set<string>;
  favoriteEnabled: boolean;
  onOpen: (index: number) => void;
  onToggleFavorite: (photo: ClientPhoto) => void;
}) {
  return (
    <ul className="mx-auto grid max-w-[1800px] grid-cols-2 gap-2 px-2 sm:grid-cols-2 sm:gap-3 sm:px-4 lg:grid-cols-3 lg:gap-4 lg:px-6">
      {photos.map((photo, index) => {
        const orientation = imageOrientation(photo.width, photo.height);
        const ratio =
          photo.width && photo.height
            ? `${photo.width} / ${photo.height}`
            : undefined;

        return (
          <li key={photo.id} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={`View ${photo.caption || photo.filename}`}
              className="block w-full cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ backgroundColor: photo.blurColor }}
            >
              <div
                className={ratio ? "" : skeletonAspectForOrientation(orientation)}
                style={ratio ? { aspectRatio: ratio } : undefined}
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.caption || ""}
                  width={photo.width || 1200}
                  height={photo.height || 1500}
                  // The first screenful is eager; everything below waits. On a
                  // 400-photo gallery this is the difference between a fast
                  // first paint and 400 simultaneous requests.
                  loading={index < 6 ? "eager" : "lazy"}
                  priority={index < 3}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  // Unoptimized deliberately. The thumbnail in R2 is already the
                  // exact WebP we want, and a signed URL's query string changes
                  // hourly — routing it through Next's optimizer would re-encode
                  // the whole gallery every hour and push every byte back through
                  // Vercel's bandwidth, which is the cost R2 was chosen to avoid.
                  unoptimized
                  className="h-full w-full object-cover transition-[transform,opacity] duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                />
              </div>
            </button>

            {favoriteEnabled ? (
              <div className="absolute bottom-3 right-3">
                <FavoriteButton
                  active={favorites.has(photo.id)}
                  label={photo.caption || photo.filename}
                  onToggle={() => onToggleFavorite(photo)}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
