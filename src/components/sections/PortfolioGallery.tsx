"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { PORTFOLIO_CATEGORIES, type PortfolioCategory, type PortfolioItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface PortfolioGalleryProps {
  items: PortfolioItemDTO[];
  initialProjectId?: string;
}

export function PortfolioGallery({ items, initialProjectId }: PortfolioGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory | "All">("All");
  const [selectedItem, setSelectedItem] = useState<PortfolioItemDTO | null>(null);

  const filtered =
    activeCategory === "All"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const openProject = useCallback((item: PortfolioItemDTO) => {
    setSelectedItem(item);
    document.body.style.overflow = "hidden";
    window.history.replaceState(null, "", `/portfolio?project=${item.id}`);
  }, []);

  const closeProject = useCallback(() => {
    setSelectedItem(null);
    document.body.style.overflow = "";
    window.history.replaceState(null, "", "/portfolio");
  }, []);

  useEffect(() => {
    if (initialProjectId) {
      const item = items.find((p) => p.id === initialProjectId);
      if (item) {
        openProject(item);
      } else {
        window.history.replaceState(null, "", "/portfolio");
      }
    }
  }, [initialProjectId, items, openProject]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProject();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeProject]);

  return (
    <>
      <div className="sticky top-[72px] z-30 border-b border-stone/30 bg-ink/95 backdrop-blur-md">
        <div className="container-wide overflow-x-auto px-5 py-4 md:px-8 lg:px-12">
          <div className="flex gap-2">
            <FilterButton active={activeCategory === "All"} onClick={() => setActiveCategory("All")}>
              All
            </FilterButton>
            {PORTFOLIO_CATEGORIES.map((cat) => (
              <FilterButton
                key={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      <div className="section-padding pt-10">
        <div className="container-wide">
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-2xl text-cream">No work in this category yet.</p>
              <p className="mt-3 text-sm text-fog">Check back soon or book a shoot to be first.</p>
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openProject(item)}
                  className="group mb-4 block w-full break-inside-avoid overflow-hidden bg-charcoal text-left"
                >
                  <div className="relative aspect-[4/5]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.imageAlt || item.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/30" />
                  </div>
                  <div className="p-4">
                    <p className="label-caps text-[0.55rem]">{item.category}</p>
                    <h3 className="mt-1 font-display text-lg">{item.title}</h3>
                    {item.client && (
                      <p className="mt-0.5 text-xs text-muted">{item.client}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedItem && <ProjectModal item={selectedItem} onClose={closeProject} />}
    </>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors duration-300",
        active
          ? "bg-cream text-ink"
          : "border border-stone/50 text-fog hover:border-fog hover:text-cream"
      )}
    >
      {children}
    </button>
  );
}

function ProjectModal({
  item,
  onClose,
}: {
  item: PortfolioItemDTO;
  onClose: () => void;
}) {
  const images = item.gallery.length > 0 ? item.gallery : item.image ? [item.image] : [];
  const trapRef = useFocusTrap(true, onClose);

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/95 p-4 md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div className="relative my-8 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 right-0 z-10 label-caps text-fog hover:text-cream md:-top-8"
          aria-label="Close project"
        >
          Close ×
        </button>

        {images.length > 0 ? (
          <div className="space-y-4">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-[16/10] overflow-hidden bg-charcoal">
                <Image
                  src={src}
                  alt={`${item.title} — image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 896px"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="aspect-[16/10] bg-charcoal" />
        )}

        <div className="mt-8 border-t border-stone/30 pt-8">
          <p className="label-caps">{item.category}</p>
          <h2 id="project-modal-title" className="headline-md mt-2">{item.title}</h2>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            {item.client && <span>{item.client}</span>}
            <span>{item.year}</span>
          </div>
          <p className="body-lg mt-5">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
