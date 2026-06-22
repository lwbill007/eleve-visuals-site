"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";

export function SessionsCollectionHero({
  featuredPoster,
  featuredAlt,
}: {
  featuredPoster: string | null;
  featuredAlt: string;
}) {
  return (
    <section className="relative flex min-h-[70vh] items-end overflow-hidden md:min-h-[85vh]">
      {featuredPoster ? (
        <Image
          src={featuredPoster}
          alt={featuredAlt}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
      )}
      <div className="cinematic-overlay absolute inset-0 bg-ink/70" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full section-padding pb-16 pt-32 md:pb-24">
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="label-caps mb-4 text-accent"
          >
            Exclusive Productions
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="headline-xl max-w-4xl text-balance"
          >
            ÉLEVÉ Sessions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="body-lg mt-6 max-w-2xl text-fog"
          >
            Limited creative productions where photographers, models, stylists, and artists
            collaborate to create unforgettable visual stories.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export function getHeroPosterFromVolumes(volumes: SessionVolumeDTO[]): {
  poster: string | null;
  alt: string;
} {
  const featured = volumes.find((v) => v.featured) || volumes[0];
  if (!featured) return { poster: null, alt: "ÉLEVÉ Sessions" };
  return {
    poster: resolveSessionPosterImage(featured),
    alt: featured.posterImageAlt || featured.title,
  };
}
