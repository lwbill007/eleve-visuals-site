"use client";

import { useMemo, useState } from "react";
import type { PortfolioItemDTO, PortfolioPageContent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PortfolioCard } from "./PortfolioCard";
import { PortfolioEmptyState } from "./PortfolioStats";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-5 py-2.5 text-xs tracking-[0.12em] uppercase transition-all duration-300",
        active
          ? "bg-cream text-ink shadow-lg shadow-ink/20"
          : "border border-stone/40 text-fog hover:border-fog hover:text-cream"
      )}
    >
      {children}
    </button>
  );
}

export function PortfolioWorkGallery({
  items,
  categories,
  featuredSlug,
  emptyState,
}: {
  items: PortfolioItemDTO[];
  categories: string[];
  featuredSlug?: string | null;
  emptyState: PortfolioPageContent["emptyState"];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const gridItems = useMemo(() => {
    const withoutFeatured = featuredSlug
      ? items.filter((item) => item.slug !== featuredSlug)
      : items;
    if (activeCategory === "All") return withoutFeatured;
    return withoutFeatured.filter((item) => item.category === activeCategory);
  }, [items, activeCategory, featuredSlug]);

  const usedCategories = useMemo(() => {
    const fromItems = new Set(items.map((i) => i.category));
    return categories.filter((c) => fromItems.has(c) || c.length > 0);
  }, [items, categories]);

  return (
    <>
      <div className="sticky top-[72px] z-30 border-b border-stone/30 bg-ink/95 backdrop-blur-md">
        <div className="container-wide overflow-x-auto px-5 py-5 md:px-8 lg:px-12">
          <div className="flex gap-2 pb-1">
            <FilterChip active={activeCategory === "All"} onClick={() => setActiveCategory("All")}>
              All
            </FilterChip>
            {usedCategories.map((cat) => (
              <FilterChip
                key={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="section-padding pt-12">
        <div className="container-wide">
          {gridItems.length === 0 ? (
            <PortfolioEmptyState emptyState={emptyState} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {gridItems.map((item, index) => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  index={index}
                  wideSpan={item.aspectRatio === "wide" && index % 5 === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
