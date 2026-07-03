export interface GalleryItem {
  type: "image" | "video";
  src: string;
  embed?: string | null;
  alt?: string;
}

export type GalleryColumns = "narrow" | "standard" | "wide";

export interface GalleryMasonryProps {
  items: GalleryItem[];
  /** Section label (small caps) */
  label?: string;
  /** Main heading */
  title?: string;
  subtitle?: string;
  /** Frame count in header */
  showCount?: boolean;
  tone?: "default" | "soft";
  id?: string;
  columns?: GalleryColumns;
  /** When true, wraps with section padding and container */
  variant?: "section" | "embedded";
}
