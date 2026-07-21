import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import type { GalleryItem } from "@/components/gallery/types";

export function CinematicGallery({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="section-padding overflow-x-clip border-b border-stone/30">
      <div className="container-wide min-w-0">
        <header className="mb-10 max-w-2xl sm:mb-12">
          <p className="label-caps mb-4 text-accent">The Work</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">Frames from the archive</h2>
          <p className="body-lg mt-5">
            A look across the Volumes — the stills, the sets, the moments between takes.
          </p>
        </header>

        <GalleryMasonry items={items} variant="embedded" columns="wide" showCount={false} />
      </div>
    </section>
  );
}
