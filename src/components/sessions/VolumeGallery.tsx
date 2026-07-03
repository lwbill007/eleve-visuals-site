"use client";

import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import type { GalleryItem } from "@/components/gallery/types";

export type { GalleryItem as LightboxItem };

export function VolumeGallery({
  title,
  subtitle,
  items,
  tone = "default",
  id,
}: {
  title: string;
  subtitle?: string;
  items: GalleryItem[];
  tone?: "default" | "soft";
  id?: string;
}) {
  return (
    <GalleryMasonry
      id={id}
      items={items}
      label={title}
      subtitle={subtitle}
      tone={tone}
      columns="standard"
      showCount
    />
  );
}
