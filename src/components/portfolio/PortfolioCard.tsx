"use client";

import Image from "next/image";
import Link from "next/link";
import type { PortfolioItemDTO } from "@/lib/types";
import { aspectRatioClass, resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { cn } from "@/lib/utils";

export function PortfolioCard({
  item,
  index,
  wideSpan = false,
}: {
  item: PortfolioItemDTO;
  index: number;
  wideSpan?: boolean;
}) {
  const cover = resolvePortfolioCoverImage(item.image, item.gallery);

  return (
    <article
      className={cn(
        wideSpan
          ? "md:col-span-12"
          : index % 2 === 0
            ? "md:col-span-7"
            : "md:col-span-5"
      )}
    >
      <Link
        href={`/portfolio/${item.slug}`}
        className="group block overflow-hidden bg-charcoal"
      >
        <div className={cn("relative overflow-hidden", aspectRatioClass(item.aspectRatio, wideSpan))}>
          {cover ? (
            <Image
              src={cover}
              alt={item.imageAlt || item.title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 58vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
            <p className="label-caps text-[0.55rem] text-fog">{item.category}</p>
            <h3 className="mt-1 font-display text-xl md:text-2xl">{item.title}</h3>
            {item.subtitle && (
              <p className="mt-1 text-sm text-cream-dim">{item.subtitle}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[0.65rem] tracking-wide text-muted uppercase">
                {item.client && <span className="break-words">{item.client}</span>}
                {item.year && <span>{item.year}</span>}
              </div>
              <span className="shrink-0 text-[0.65rem] tracking-[0.15em] text-accent uppercase transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
                View Case Study →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
