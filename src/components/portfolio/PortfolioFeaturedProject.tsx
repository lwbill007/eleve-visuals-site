"use client";

import Image from "next/image";
import Link from "next/link";
import type { PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";

export function PortfolioFeaturedProject({ project }: { project: PortfolioItemDTO }) {
  const cover = resolvePortfolioCoverImage(project.image, project.gallery);

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-8 flex items-center justify-between gap-6 border-t border-stone/50 pt-5">
          <p className="label-caps text-accent">Featured project</p>
          <p className="label-caps text-[0.55rem] text-muted">Selected case study</p>
        </div>
        <div className="grid gap-9 lg:grid-cols-12 lg:gap-14">
          <Link
            href={`/portfolio/${project.slug}`}
            className="group relative block overflow-hidden bg-charcoal lg:col-span-8 lg:min-h-[620px]"
          >
            <div className="relative aspect-[4/5] sm:aspect-[16/11] lg:absolute lg:inset-0 lg:aspect-auto">
              {cover ? (
                <Image
                  src={cover}
                  alt={project.imageAlt || project.title}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
              )}
              <div className="absolute inset-0 bg-ink/10 transition-colors duration-700 group-hover:bg-ink/25" />
            </div>
          </Link>

          <div className="flex flex-col justify-center lg:col-span-4">
            <p className="label-caps text-fog">{project.category}</p>
            <h2 className="mt-4 font-display text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.04em] text-balance">
              {project.title}
            </h2>
            {project.subtitle && (
              <p className="mt-3 font-display text-xl text-cream-dim">{project.subtitle}</p>
            )}
            <p className="body-lg mt-5 line-clamp-4 text-fog">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs tracking-wide text-muted uppercase">
              {project.client && <span>{project.client}</span>}
              {project.year && <span>{project.year}</span>}
            </div>
            <Link
              href={`/portfolio/${project.slug}`}
              className="link-underline mt-9 inline-flex min-h-11 w-fit items-center text-xs tracking-[0.2em] text-accent uppercase"
            >
              Open case study ↗
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
