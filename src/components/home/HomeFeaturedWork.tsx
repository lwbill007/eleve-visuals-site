"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomepageSectionCopy, PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { cn } from "@/lib/utils";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeFeaturedWork({
  items,
  copy,
}: {
  items: PortfolioItemDTO[];
  copy: HomepageSectionCopy;
  filters: string[];
}) {
  const stories = items.slice(0, 3);
  const headline =
    copy.headline === "Craft built to outlast the moment."
      ? "Built for the world you want to enter."
      : copy.headline;
  const subheadline =
    copy.subheadline ===
    "Editorial projects across portrait, brand, athlete, and motion — each frame intentional."
      ? "Different disciplines. One cinematic standard."
      : copy.subheadline;

  if (stories.length === 0) {
    return (
      <section className="section-padding border-b border-ink/15 bg-cream text-ink">
        <div className="container-wide">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.24em] text-ink/55">
            {copy.eyebrow || "Selected stories"}
          </p>
          <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.8rem,6vw,6rem)] leading-[0.92] tracking-[-0.04em]">
            {headline}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/65">{subheadline}</p>
          <Link
            href="/book"
            className="mt-8 inline-flex min-h-11 items-center border-b border-ink text-xs tracking-[0.2em] uppercase"
          >
            Start a project →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding border-b border-ink/15 bg-cream text-ink">
      <div className="container-wide">
        <div className="mb-10 border-t border-ink/70 pt-5 md:mb-14">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.24em] text-ink/55">
            {copy.eyebrow === "Selected Work" ? "Selected stories" : copy.eyebrow}
          </p>
          <h2 className="mt-4 max-w-6xl font-display text-[clamp(3rem,6.2vw,6.8rem)] leading-[0.9] tracking-[-0.045em] text-balance">
            {headline}
          </h2>
          {subheadline ? (
            <p className="mt-4 text-base leading-relaxed text-ink/65 md:text-lg">{subheadline}</p>
          ) : null}
        </div>

        <div className="grid gap-8 md:grid-cols-12 md:gap-x-5 md:gap-y-8">
          {stories.map((item, index) => {
            const cover = resolvePortfolioCoverImage(item.image, item.gallery);
            const lead = index === 0;
            return (
              <article
                key={item.id}
                className={cn(
                  lead ? "md:col-span-5 md:row-span-2" : "md:col-span-7 md:col-start-6"
                )}
              >
                <Link
                  href={`/portfolio/${item.slug}`}
                  onClick={() =>
                    trackEngagement({
                      event: "cta_click",
                      path: "/",
                      label: `featured_story_${item.slug}`,
                    })
                  }
                  className="group block"
                >
                  <div
                    className={cn(
                      "relative overflow-hidden bg-charcoal",
                      lead ? "aspect-[4/5] md:min-h-[680px]" : "aspect-[16/8] md:min-h-[300px]"
                    )}
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt={item.imageAlt || item.title}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
                        sizes={lead ? "(max-width: 768px) 100vw, 42vw" : "(max-width: 768px) 100vw, 58vw"}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-charcoal" />
                    )}
                    {lead ? <div className="absolute inset-0 bg-ink/10" /> : null}
                  </div>

                  <div className="grid grid-cols-[auto_1fr] gap-4 border-b border-ink/35 py-5 md:gap-6">
                    <span className="font-display text-3xl italic text-accent-dim md:text-4xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ink/55">
                        {item.category || "Editorial story"}
                      </p>
                      <div className="mt-1 flex items-end justify-between gap-4">
                        <h3 className="font-display text-3xl leading-none tracking-[-0.03em] md:text-4xl">
                          {item.title}
                        </h3>
                        <span className="hidden shrink-0 text-[0.6rem] font-medium uppercase tracking-[0.18em] md:block">
                          View case study →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-5">
          <Link
            href="/portfolio"
            onClick={() =>
              trackEngagement({ event: "cta_click", path: "/", label: "featured_work_all" })
            }
            className="inline-flex min-h-11 items-center text-xs font-medium tracking-[0.2em] uppercase"
          >
            Explore all work →
          </Link>
          <span className="h-px flex-1 bg-accent-dim/60" aria-hidden />
        </div>
      </div>
    </section>
  );
}
