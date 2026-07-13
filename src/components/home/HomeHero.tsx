"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { HeroContent } from "@/lib/types";
import { trackEngagement, trackFunnel } from "@/lib/analytics-client";

export function HomeHero({
  hero,
  experimentId,
}: {
  hero: HeroContent;
  experimentId?: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const primaryLabel = hero.primaryCta.label || "Book Your Experience";
  const secondaryLabel = hero.secondaryCta.label || "Explore Portfolio";

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-end overflow-hidden"
      aria-label="Hero"
      data-experiment-slot="hero"
      data-experiment-id={experimentId || undefined}
    >
      <motion.div className="absolute inset-0" style={{ y }}>
        {hero.videoUrl ? (
          <video
            src={hero.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover scale-105"
            aria-hidden
          />
        ) : hero.image ? (
          <Image
            src={hero.image}
            alt={hero.imageAlt || "ÉLEVÉ Visuals"}
            fill
            priority
            className="object-cover scale-105"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
        )}
      </motion.div>

      <div className="cinematic-overlay absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
      <div className="grain absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(184,168,138,0.08),transparent_55%)]" />

      <motion.div
        className="relative z-10 w-full section-padding pb-20 pt-32 md:pb-28 md:pt-40"
        style={{ opacity }}
      >
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="label-caps mb-6 text-accent"
          >
            ÉLEVÉ Visuals
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.18 }}
            className="headline-xl max-w-5xl text-balance text-cream"
          >
            {hero.headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.28 }}
            className="body-lg mt-8 max-w-2xl text-fog"
          >
            {hero.subheadline}
          </motion.p>
          {hero.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.34 }}
              className="mt-4 max-w-xl text-sm leading-relaxed text-muted"
            >
              {hero.description}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.42 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              href={hero.primaryCta.href || "/book"}
              onClick={() => {
                trackEngagement({ event: "cta_click", path: "/", label: "hero_primary" });
                trackFunnel("hero_cta_clicked", { metadata: { cta: "primary" } });
              }}
            >
              {primaryLabel}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href={hero.secondaryCta.href || "/portfolio"}
              onClick={() => {
                trackEngagement({ event: "cta_click", path: "/", label: "hero_secondary" });
                trackFunnel("hero_cta_clicked", { metadata: { cta: "secondary" } });
              }}
            >
              {secondaryLabel}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 md:block"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <span className="label-caps text-[0.55rem] text-muted">Scroll</span>
          <div className="h-12 w-px animate-pulse bg-gradient-to-b from-accent/60 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
