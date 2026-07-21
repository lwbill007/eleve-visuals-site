"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { HomepageSectionCopy, PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { cn } from "@/lib/utils";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeFeaturedWork({
  items,
  copy,
  filters,
}: {
  items: PortfolioItemDTO[];
  copy: HomepageSectionCopy;
  filters: string[];
}) {
  const [active, setActive] = useState("All");

  const filtered = useMemo(() => {
    if (active === "All") return items;
    if (active === "Motion") {
      return items.filter((i) => i.category === "Video" || i.category === "Motion");
    }
    return items.filter((i) => i.category === active);
  }, [items, active]);

  const filterOptions = ["All", ...filters];
  const showFilters = items.length > 1 && filterOptions.length > 1;

  if (items.length === 0) {
    return (
      <section className="section-padding border-b border-stone/30">
        <div className="container-wide text-center">
          <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>
          <h2 className="headline-lg">{copy.headline}</h2>
          <p className="body-lg mx-auto mt-4 max-w-xl text-fog">{copy.subheadline}</p>
          <Link
            href="/book"
            onClick={() =>
              trackEngagement({ event: "cta_click", path: "/", label: "featured_work_empty_book" })
            }
            className="label-caps link-underline mt-8 inline-block text-accent"
          >
            Book a project →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-12 grid gap-6 border-t border-stone/50 pt-6 md:mb-16 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            {copy.eyebrow ? <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p> : null}
            <h2 className="font-display text-[clamp(2.8rem,5vw,5.75rem)] leading-[0.94] tracking-[-0.035em] text-balance">
              {copy.headline}
            </h2>
          </div>
          <div className="md:col-span-4 md:pb-2">
            {copy.subheadline ? (
              <p className="text-sm leading-relaxed text-fog md:text-base">{copy.subheadline}</p>
            ) : null}
            <p className="label-caps mt-4 text-[0.55rem] text-muted">
              {items.length} featured {items.length === 1 ? "story" : "stories"}
            </p>
          </div>
        </div>

        {showFilters ? <div className="mb-10 flex flex-wrap gap-2">
          {filterOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={active === cat}
              className={cn(
                "inline-flex min-h-11 items-center px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                active === cat
                  ? "bg-cream text-ink"
                  : "border border-stone/50 text-fog hover:border-cream/40 hover:text-cream"
              )}
            >
              {cat}
            </button>
          ))}
        </div> : null}

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-fog">No projects in this collection yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-12">
            {filtered.map((item, index) => {
              const cover = resolvePortfolioCoverImage(item.image, item.gallery);
              const isHero = index === 0;
              const isSingle = filtered.length === 1;
              return (
                <div
                  key={item.id}
                  className={cn(
                    isSingle
                      ? "md:col-span-12"
                      : isHero
                        ? "md:col-span-7 md:row-span-2"
                        : "md:col-span-5"
                  )}
                >
                  <Link
                    href={`/portfolio/${item.slug}`}
                    onClick={() =>
                      trackEngagement({
                        event: "cta_click",
                        path: "/",
                        label: `featured_work_${item.slug}`,
                      })
                    }
                    className={cn(
                      "group relative block overflow-hidden bg-charcoal",
                      isSingle
                        ? "aspect-[4/5] sm:aspect-[16/10] md:max-h-[760px]"
                        : isHero
                          ? "min-h-[420px] md:min-h-[640px]"
                          : "min-h-[320px] md:min-h-[380px]"
                    )}
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt={item.imageAlt || item.title}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
                        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/30 to-transparent transition-opacity duration-500 group-hover:from-ink" />
                    <div className="absolute right-0 bottom-0 left-0 p-6 md:p-8">
                      <p className="label-caps text-[0.55rem] text-fog">{item.category}</p>
                      <h3 className="mt-2 font-display text-2xl md:text-3xl">{item.title}</h3>
                      {item.description && (
                        <p className="mt-3 line-clamp-2 max-w-lg text-sm text-fog opacity-90">
                          {item.description}
                        </p>
                      )}
                      <span className="label-caps mt-4 inline-block text-accent opacity-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 md:opacity-0 md:group-hover:opacity-100">
                        View case study →
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/portfolio"
            onClick={() =>
              trackEngagement({ event: "cta_click", path: "/", label: "featured_work_all" })
            }
            className="label-caps link-underline text-accent hover:text-cream"
          >
            Explore full portfolio →
          </Link>
        </div>
      </div>
    </section>
  );
}
