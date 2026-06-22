"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
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
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.75, delay: (index % 6) * 0.06 }}
      className={cn(wideSpan && "lg:col-span-2")}
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
              className="object-cover transition-transform duration-[1.1s] group-hover:scale-[1.05]"
              style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              sizes="(max-width: 768px) 100vw, 33vw"
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
              <div className="flex gap-3 text-[0.65rem] tracking-wide text-muted uppercase">
                {item.client && <span>{item.client}</span>}
                {item.year && <span>{item.year}</span>}
              </div>
              <span className="text-[0.65rem] tracking-[0.15em] text-accent uppercase opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                View Case Study →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
