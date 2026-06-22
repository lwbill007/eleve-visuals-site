"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { PortfolioItemDTO } from "@/lib/types";
import { getPortfolioPreviewImage } from "@/lib/services-page";
import { cn } from "@/lib/utils";

export function ServiceEditorialSection({
  slug,
  eyebrow,
  headline,
  description,
  capabilities,
  ctaLabel,
  ctaHref,
  image,
  imageAlt,
  startingPrice,
  featuredProject,
  reversed = false,
}: {
  slug: string;
  eyebrow: string;
  headline: string;
  description: string;
  capabilities: string[];
  ctaLabel: string;
  ctaHref: string;
  image: string | null;
  imageAlt: string;
  startingPrice: string | null;
  featuredProject: PortfolioItemDTO | null;
  reversed?: boolean;
}) {
  const previewImage = featuredProject ? getPortfolioPreviewImage(featuredProject) : null;

  return (
    <article
      id={slug}
      className="scroll-mt-28 border-b border-stone/30 last:border-b-0"
    >
      <div className="section-padding">
        <div className="container-wide">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: reversed ? 32 : -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "lg:col-span-6",
                reversed && "lg:col-start-7 lg:row-start-1"
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-charcoal shadow-2xl shadow-black/30">
                {image ? (
                  <Image
                    src={image}
                    alt={imageAlt}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
              </div>

              {featuredProject && previewImage && (
                <Link
                  href={`/portfolio/${featuredProject.slug}`}
                  className="group mt-4 flex items-center gap-4 border border-stone/30 bg-charcoal/40 p-4 transition-colors hover:border-accent/40"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-ink">
                    <Image
                      src={previewImage}
                      alt={featuredProject.imageAlt || featuredProject.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] tracking-[0.2em] text-muted uppercase">
                      Featured Project
                    </p>
                    <p className="truncate font-display text-lg text-cream group-hover:text-accent">
                      {featuredProject.title}
                    </p>
                    <p className="text-xs text-fog">{featuredProject.category}</p>
                  </div>
                </Link>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "lg:col-span-6",
                reversed && "lg:col-start-1 lg:row-start-1"
              )}
            >
              <p className="label-caps mb-4 text-accent">{eyebrow}</p>
              <h2 className="headline-lg text-balance">{headline}</h2>
              <p className="body-lg mt-6 max-w-xl text-fog">{description}</p>

              {startingPrice && (
                <p className="mt-6 font-display text-2xl text-accent">{startingPrice}</p>
              )}

              <div className="mt-10">
                <p className="mb-4 text-[0.65rem] tracking-[0.15em] text-muted uppercase">
                  Capabilities
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {capabilities.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-fog">
                      <span className="text-accent">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10">
                <Button variant="primary" href={ctaHref}>
                  {ctaLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </article>
  );
}
