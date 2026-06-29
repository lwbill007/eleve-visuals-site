"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";

export function VolumeHero({
  volume,
  canApply,
  hasTrailer,
}: {
  volume: SessionVolumeDTO;
  canApply: boolean;
  hasTrailer: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.7, 0.95]);

  const artwork = volume.bannerImage || resolveSessionPosterImage(volume);
  const chips = [volume.genre, volume.theme, volume.mood].filter(Boolean);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        {artwork ? (
          <Image
            src={artwork}
            alt={volume.bannerImageAlt || volume.posterImageAlt || volume.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink-soft to-ink" />
        )}
      </motion.div>

      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
      <div className="cinematic-overlay absolute inset-0" />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.5]" />

      <div className="relative z-10 w-full section-padding pb-24 pt-32">
        <div className="container-wide">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/sessions" className="label-caps mb-8 inline-block text-fog transition-colors hover:text-cream">
              ← All Volumes
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.2em] text-cream-dim uppercase">
                ÉLEVÉ Sessions · Vol. {volume.volumeNumber} · {volume.year}
              </span>
            </div>

            {volume.theme && <p className="label-caps mt-6 text-accent">{volume.theme}</p>}
            <h1 className="headline-xl mt-3 max-w-5xl text-balance">{volume.title}</h1>
            {volume.subtitle && (
              <p className="mt-5 max-w-2xl font-display text-2xl leading-snug text-cream-dim md:text-3xl">
                {volume.subtitle}
              </p>
            )}

            {chips.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-stone/40 px-3 py-1 text-[0.7rem] tracking-[0.12em] text-fog uppercase"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {volume.applicationDeadline && canApply && (
              <div className="mt-6">
                <SessionCountdown deadline={volume.applicationDeadline} />
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-4">
              {canApply && (
                <Link
                  href={`/sessions/${volume.slug}/apply`}
                  className="bg-cream px-8 py-4 text-xs tracking-[0.18em] text-ink uppercase transition-colors hover:bg-accent"
                >
                  Apply for Vol. {volume.volumeNumber}
                </Link>
              )}
              <a
                href="#trailer"
                className="group flex items-center gap-3 border border-cream/40 px-7 py-4 text-xs tracking-[0.18em] text-cream uppercase transition-colors hover:border-accent hover:text-accent"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                  <span className="ml-0.5 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
                </span>
                {hasTrailer ? "Watch Trailer" : "Trailer Coming Soon"}
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {!reduce && (
        <motion.div
          className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 9, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-fog"
          >
            <span className="text-[0.6rem] tracking-[0.3em] uppercase">Scroll</span>
            <span className="h-9 w-px bg-gradient-to-b from-fog to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
