"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";
import { Button } from "@/components/ui/Button";

export function PortfolioFeaturedProject({ project }: { project: PortfolioItemDTO }) {
  const cover = resolvePortfolioCoverImage(project.image, project.gallery);

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9 }}
          className="grid gap-8 lg:grid-cols-12 lg:gap-10"
        >
          <Link
            href={`/portfolio/${project.slug}`}
            className="group relative block overflow-hidden bg-charcoal lg:col-span-7 lg:min-h-[560px]"
          >
            <div className="relative aspect-[4/5] lg:absolute lg:inset-0 lg:aspect-auto">
              {cover ? (
                <Image
                  src={cover}
                  alt={project.imageAlt || project.title}
                  fill
                  priority
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
                  style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
              )}
              <div className="absolute inset-0 bg-ink/10 transition-colors duration-700 group-hover:bg-ink/25" />
            </div>
          </Link>

          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="label-caps text-accent">Featured Project</p>
            <p className="label-caps mt-4 text-fog">{project.category}</p>
            <h2 className="headline-lg mt-3 text-balance">{project.title}</h2>
            {project.subtitle && (
              <p className="mt-3 font-display text-xl text-cream-dim">{project.subtitle}</p>
            )}
            <p className="body-lg mt-5 line-clamp-4 text-fog">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs tracking-wide text-muted uppercase">
              {project.client && <span>{project.client}</span>}
              {project.year && <span>{project.year}</span>}
            </div>
            <div className="mt-8">
              <Button variant="primary" href={`/portfolio/${project.slug}`} size="lg">
                View Project
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
