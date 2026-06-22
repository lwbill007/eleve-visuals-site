"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { cn } from "@/lib/utils";

const aspectClasses = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
  wide: "aspect-[21/9]",
};

export function ServicesFeaturedWork({
  eyebrow,
  headline,
  subheadline,
  items,
}: {
  eyebrow: string;
  headline: string;
  subheadline: string;
  items: PortfolioItemDTO[];
}) {
  if (items.length === 0) {
    return (
      <section className="section-padding border-y border-stone/30">
        <div className="container-wide text-center">
          <p className="label-caps mb-4 text-accent">{eyebrow}</p>
          <h2 className="headline-md">{headline}</h2>
          <p className="body-lg mx-auto mt-4 max-w-xl text-fog">{subheadline}</p>
          <Link
            href="/book"
            className="label-caps link-underline mt-8 inline-block text-accent hover:text-cream"
          >
            Book a project →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding border-y border-stone/30">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <p className="label-caps mb-4 text-accent">{eyebrow}</p>
          <h2 className="headline-md">{headline}</h2>
          <p className="body-lg mt-4 text-fog">{subheadline}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          {items.slice(0, 4).map((item, index) => {
            const coverImage = resolvePortfolioCoverImage(item.image, item.gallery);
            const spans =
              index === 0
                ? "md:col-span-7 md:row-span-2"
                : index === 1
                  ? "md:col-span-5"
                  : "md:col-span-4";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: index * 0.08 }}
                className={cn("group", spans)}
              >
                <Link
                  href={`/portfolio/${item.slug}`}
                  className={cn(
                    "relative block overflow-hidden bg-charcoal",
                    index === 0
                      ? "aspect-[4/5] md:aspect-auto md:min-h-[520px]"
                      : aspectClasses[item.aspectRatio]
                  )}
                >
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt={item.imageAlt || item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                  <div className="absolute right-0 bottom-0 left-0 p-6">
                    <p className="label-caps mb-1 text-[0.55rem] text-fog">{item.category}</p>
                    <h3 className="font-display text-xl md:text-2xl">{item.title}</h3>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-fog opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
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
