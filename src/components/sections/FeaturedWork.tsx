"use client";

import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/Section";
import type { PortfolioItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const aspectClasses = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
  wide: "aspect-[21/9]",
};

interface FeaturedWorkProps {
  items: PortfolioItemDTO[];
}

export function FeaturedWork({ items }: FeaturedWorkProps) {
  if (items.length === 0) {
    return (
      <section className="section-padding border-b border-stone/30">
        <div className="container-wide text-center">
          <SectionHeader
            eyebrow="Selected Work"
            headline="Portfolio coming soon."
            subheadline="New work is being added. In the meantime, book a shoot or get in touch."
            align="center"
          />
          <Link
            href="/book"
            className="label-caps link-underline text-accent hover:text-cream"
          >
            Book a shoot →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-wide">
        <SectionHeader
          eyebrow="Selected Work"
          headline="Frames that carry weight."
          subheadline="A curated selection from recent projects — portraits, brands, athletes, and motion."
        />

        <div className="grid gap-3 md:grid-cols-12 md:gap-4">
          {items.map((item, index) => {
            const spans =
              index === 0
                ? "md:col-span-7 md:row-span-2"
                : index === 1
                  ? "md:col-span-5"
                  : index === 2
                    ? "md:col-span-4"
                    : index === 3
                      ? "md:col-span-4"
                      : "md:col-span-4";

            return (
              <Link
                key={item.id}
                href={`/portfolio?project=${item.id}`}
                className={cn(
                  "group relative overflow-hidden bg-charcoal",
                  spans,
                  index === 0
                    ? "aspect-[4/5] md:aspect-auto md:min-h-[520px]"
                    : aspectClasses[item.aspectRatio]
                )}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.imageAlt || item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute right-0 bottom-0 left-0 p-5 md:p-6">
                  <p className="label-caps mb-1 text-[0.55rem] text-fog">{item.category}</p>
                  <h3 className="font-display text-xl md:text-2xl">{item.title}</h3>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/portfolio"
            className="label-caps link-underline text-accent hover:text-cream"
          >
            View full portfolio →
          </Link>
        </div>
      </div>
    </section>
  );
}
