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
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center px-4 py-2.5 text-xs tracking-[0.12em] uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        active
          ? "bg-cream text-ink"
          : "border border-stone/50 text-fog hover:border-cream/40 hover:text-cream"
      )}
    >
      {children}
    </button>
  );
}

export function PortfolioWorkGallery({
  items,
  categories,
  emptyState,
}: {
  items: PortfolioItemDTO[];
  categories: string[];
  emptyState: PortfolioPageContent["emptyState"];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const gridItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const usedCategories = useMemo(() => {
    const fromItems = new Set(items.map((i) => i.category));
    return categories.filter((category) => fromItems.has(category));
  }, [items, categories]);
  const showFilters = usedCategories.length > 1;

  return (
    <section className="border-b border-stone/30" aria-labelledby="portfolio-archive-heading">
      <div className="container-wide section-padding pb-8">
        <div className="grid gap-5 border-t border-stone/50 pt-5 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="label-caps mb-4 text-accent">Project archive</p>
            <h2
              id="portfolio-archive-heading"
              className="font-display text-[clamp(2.8rem,5vw,5.75rem)] leading-[0.94] tracking-[-0.035em]"
            >
              More selected work.
            </h2>
          </div>
          <p
            className="text-sm leading-relaxed text-fog md:col-span-4 md:pb-2"
            aria-live="polite"
          >
            {gridItems.length} {gridItems.length === 1 ? "project" : "projects"} in this collection.
          </p>
        </div>
      </div>

      {showFilters ? (
        <div className="sticky top-[72px] z-30 border-y border-stone/30 bg-ink/95 backdrop-blur-md">
          <div className="container-wide overflow-x-auto px-5 py-4 md:px-8 lg:px-12">
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
      ) : null}

      <div className="section-padding pt-6 md:pt-10">
        <div className="container-wide">
          {gridItems.length === 0 ? (
            <PortfolioEmptyState emptyState={emptyState} />
          ) : (
            <div className="grid gap-5 md:grid-cols-12">
              {gridItems.map((item, index) => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  index={index}
                  wideSpan={item.aspectRatio === "wide"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
