export type ImageOrientation = "portrait" | "landscape" | "square";

export function imageOrientation(width: number, height: number): ImageOrientation {
  if (!width || !height) return "portrait";
  const ratio = width / height;
  if (ratio > 1.08) return "landscape";
  if (ratio < 0.92) return "portrait";
  return "square";
}

/** Skeleton aspect ratio before the real image dimensions load. */
export function skeletonAspectForOrientation(orientation: ImageOrientation): string {
  switch (orientation) {
    case "landscape":
      return "aspect-[4/3]";
    case "square":
      return "aspect-square";
    default:
      return "aspect-[4/5]";
  }
}

export function galleryImageSizes(columns: "narrow" | "standard" | "wide"): string {
  switch (columns) {
    case "narrow":
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
    case "wide":
      return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
    default:
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
  }
}

export function masonryColumnClass(columns: "narrow" | "standard" | "wide"): string {
  switch (columns) {
    case "narrow":
      return "columns-1 gap-4 sm:columns-2 lg:columns-3";
    case "wide":
      return "columns-1 gap-4 min-[480px]:columns-2 md:columns-3 md:gap-4 lg:columns-4";
    default:
      return "columns-1 gap-4 min-[520px]:columns-2 lg:columns-3";
  }
}
