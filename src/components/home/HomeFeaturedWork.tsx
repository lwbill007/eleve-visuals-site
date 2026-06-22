"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { HomepageSectionCopy, PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { cn } from "@/lib/utils";

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

  if (items.length === 0) {
    return (
      <section className="section-padding border-b border-stone/30">
        <div className="container-wide text-center">
          <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>
          <h2 className="headline-lg">{copy.headline}</h2>
          <p className="body-lg mx-auto mt-4 max-w-xl text-fog">{copy.subheadline}</p>
          <Link href="/book" className="label-caps link-underline mt-8 inline-block text-accent">
            Book a project →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 max-w-3xl md:mb-16"
        >
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg text-balance">{copy.headline}</h2>
          {copy.subheadline && <p className="body-lg mt-5 text-fog">{copy.subheadline}</p>}
        </motion.div>

        <div className="mb-10 flex flex-wrap gap-2">
          {filterOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              className={cn(
                "rounded-full px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all duration-300",
                active === cat
                  ? "bg-cream text-ink"
                  : "border border-stone/40 text-fog hover:border-fog hover:text-cream"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-fog">No projects in this collection yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-12">
            {filtered.map((item, index) => {
              const cover = resolvePortfolioCoverImage(item.image, item.gallery);
              const isHero = index === 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.85, delay: index * 0.06 }}
                  className={cn(isHero ? "md:col-span-7 md:row-span-2" : "md:col-span-5")}
                >
                  <Link
                    href={`/portfolio/${item.slug}`}
                    className={cn(
                      "group relative block overflow-hidden bg-charcoal",
                      isHero ? "min-h-[420px] md:min-h-[640px]" : "min-h-[320px] md:min-h-[380px]"
                    )}
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt={item.imageAlt || item.title}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.05]"
                        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/30 to-transparent transition-opacity duration-500 group-hover:from-ink" />
                    <div className="absolute inset-0 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-accent/5" />
                    </div>
                    <div className="absolute right-0 bottom-0 left-0 p-6 md:p-8">
                      <p className="label-caps text-[0.55rem] text-fog">{item.category}</p>
                      <h3 className="mt-2 font-display text-2xl md:text-3xl">{item.title}</h3>
                      {item.description && (
                        <p className="mt-3 line-clamp-2 max-w-lg text-sm text-fog opacity-90">
                          {item.description}
                        </p>
                      )}
                      <span className="label-caps mt-4 inline-block text-accent opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        View case study →
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/portfolio" className="label-caps link-underline text-accent hover:text-cream">
            Explore full portfolio →
          </Link>
        </div>
      </div>
    </section>
  );
}
