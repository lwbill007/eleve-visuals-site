"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";
import { toVideoEmbed } from "@/lib/video-embed";

export function SessionsCinematicHero({
  volume,
  canApply,
  fallbackPoster,
  fallbackAlt,
}: {
  volume: SessionVolumeDTO | null;
  canApply: boolean;
  fallbackPoster: string | null;
  fallbackAlt: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "16%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);

  const [trailerOpen, setTrailerOpen] = useState(false);

  const backdrop = (volume ? volume.bannerImage || resolveSessionPosterImage(volume) : null) || fallbackPoster;
  const alt = volume ? volume.bannerImageAlt || volume.posterImageAlt || volume.title : fallbackAlt;

  const teaser: LightboxItem | null = volume?.teaserVideoUrl
    ? { type: "video", src: volume.teaserVideoUrl, embed: toVideoEmbed(volume.teaserVideoUrl), alt: `${volume.title} trailer` }
    : null;

  const tagline = volume?.subtitle || volume?.theme || "An ongoing series of cinematic creative productions.";

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y }}>
        {backdrop ? (
          <Image src={backdrop} alt={alt} fill priority className="scale-105 object-cover object-center" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
        )}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      <div className="grain absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(184,168,138,0.10),transparent_55%)]" />

      <motion.div style={{ opacity }} className="relative z-10 w-full section-padding pb-16 pt-32 md:pb-24">
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="label-caps mb-5 text-accent"
          >
            {volume ? `ÉLEVÉ Sessions · Vol. ${volume.volumeNumber}` : "Exclusive Productions"}
          </motion.p>

          {volume && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className="mb-5 flex flex-wrap items-center gap-3"
            >
              <SessionStatusBadge status={volume.status} />
              {volume.theme && (
                <span className="text-xs tracking-[0.18em] text-cream-dim/80 uppercase">{volume.theme}</span>
              )}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.12 }}
            className="headline-xl max-w-5xl text-balance text-cream"
          >
            {volume ? volume.title : "ÉLEVÉ Sessions"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.22 }}
            className="mt-6 max-w-2xl font-display text-2xl leading-snug text-cream-dim md:text-3xl"
          >
            {tagline}
          </motion.p>

          {volume?.applicationDeadline && canApply && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="mt-6"
            >
              <SessionCountdown deadline={volume.applicationDeadline} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.38 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            {volume && canApply ? (
              <Button variant="primary" size="lg" href={`/sessions/${volume.slug}/apply`}>
                Apply for Vol. {volume.volumeNumber}
              </Button>
            ) : (
              <Button variant="primary" size="lg" href="#browse">
                Browse Volumes
              </Button>
            )}
            {teaser && (
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="group inline-flex items-center gap-3 text-xs tracking-[0.18em] text-cream uppercase"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/40 transition-all duration-500 group-hover:scale-110 group-hover:border-cream/80">
                  <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-cream" />
                </span>
                Watch Trailer
              </button>
            )}
            {volume && (
              <Button variant="ghost" size="lg" href={`/sessions/${volume.slug}`}>
                Explore Volume
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 md:block">
        <div className="flex flex-col items-center gap-2">
          <span className="label-caps text-[0.55rem] text-muted">Browse</span>
          <span className="h-12 w-px animate-pulse bg-gradient-to-b from-accent/60 to-transparent" />
        </div>
      </div>

      {teaser && (
        <MediaLightbox items={[teaser]} index={trailerOpen ? 0 : null} onClose={() => setTrailerOpen(false)} />
      )}
    </section>
  );
}
