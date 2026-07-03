"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage, getSessionStatusLabel } from "@/lib/session-volume";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";
import { VolumeFilmPlayer } from "./VolumeFilmPlayer";

function HeroMeta({
  status,
  year,
  frameCount,
  castCount,
  videoCount,
  location,
}: {
  status: string;
  year: string;
  frameCount: number;
  castCount: number;
  videoCount: number;
  location: string;
}) {
  const items = [
    status,
    year,
    frameCount > 0 ? `${frameCount} Frame${frameCount === 1 ? "" : "s"}` : null,
    castCount > 0 ? `${castCount} Cast` : null,
    videoCount > 0 ? `${videoCount} Video${videoCount === 1 ? "" : "s"}` : null,
    location || null,
  ].filter(Boolean) as string[];

  if (items.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] tracking-[0.14em] text-cream-dim uppercase">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-3">
          {i > 0 && <span className="hidden h-1 w-1 rounded-full bg-stone/60 sm:inline-block" aria-hidden />}
          {item}
        </span>
      ))}
    </div>
  );
}

function HeroActions({
  canApply,
  volume,
  hasFeaturedFilm,
  onWatchFilm,
  onShare,
  shareLabel,
}: {
  canApply: boolean;
  volume: SessionVolumeDTO;
  hasFeaturedFilm: boolean;
  onWatchFilm: () => void;
  onShare: () => void;
  shareLabel: string;
}) {
  const primaryClass =
    "inline-flex min-h-11 items-center justify-center gap-2 bg-cream px-6 py-3.5 text-xs tracking-[0.16em] text-ink uppercase transition-colors hover:bg-accent sm:px-8";
  const secondaryClass =
    "inline-flex min-h-11 items-center justify-center gap-2 border border-cream/35 px-5 py-3.5 text-xs tracking-[0.14em] text-cream uppercase transition-colors hover:border-accent hover:text-accent sm:px-6";

  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {hasFeaturedFilm && (
        <button type="button" onClick={onWatchFilm} className={primaryClass}>
          <span aria-hidden>▶</span> Watch Film
        </button>
      )}
      {canApply && (
        <Link href={`/sessions/${volume.slug}/apply`} className={hasFeaturedFilm ? secondaryClass : primaryClass}>
          Apply for Vol. {volume.volumeNumber}
        </Link>
      )}
      <a href="#gallery" className={secondaryClass}>
        View Gallery
      </a>
      <a href="#cast" className={secondaryClass}>
        Meet the Cast
      </a>
      <a href="#bts" className={secondaryClass}>
        Behind the Scenes
      </a>
      <button type="button" onClick={onShare} className={secondaryClass}>
        {shareLabel}
      </button>
    </div>
  );
}

function HeroOverlay({
  volume,
  canApply,
  reduce,
  frameCount,
  castCount,
  videoCount,
  hasFeaturedFilm,
  onWatchFilm,
  onShare,
  shareLabel,
}: {
  volume: SessionVolumeDTO;
  canApply: boolean;
  reduce: boolean | null;
  frameCount: number;
  castCount: number;
  videoCount: number;
  hasFeaturedFilm: boolean;
  onWatchFilm: () => void;
  onShare: () => void;
  shareLabel: string;
}) {
  return (
    <>
      <div className="relative z-10 w-full section-padding pb-20 pt-28 sm:pb-24 sm:pt-32">
        <div className="container-wide">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/sessions"
              className="label-caps mb-5 inline-flex min-h-11 items-center text-fog/90 transition-colors hover:text-cream"
            >
              ← All Volumes
            </Link>

            <p className="label-caps text-fog/80">ÉLEVÉ Sessions</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.2em] text-cream-dim uppercase">
                Vol. {volume.volumeNumber} · {volume.year}
              </span>
            </div>

            {volume.theme && <p className="label-caps mt-5 text-accent">{volume.theme}</p>}
            <h1 className="headline-xl mt-2 max-w-5xl text-balance">{volume.title}</h1>
            {volume.subtitle && (
              <p className="mt-4 max-w-2xl font-display text-xl leading-snug text-cream-dim md:text-2xl lg:text-3xl">
                {volume.subtitle}
              </p>
            )}

            <HeroMeta
              status={getSessionStatusLabel(volume.status)}
              year={volume.year}
              frameCount={frameCount}
              castCount={castCount}
              videoCount={videoCount}
              location={volume.city || volume.location}
            />

            {volume.applicationDeadline && canApply && (
              <div className="mt-6">
                <SessionCountdown deadline={volume.applicationDeadline} />
              </div>
            )}

            <HeroActions
              canApply={canApply}
              volume={volume}
              hasFeaturedFilm={hasFeaturedFilm}
              onWatchFilm={onWatchFilm}
              onShare={onShare}
              shareLabel={shareLabel}
            />
          </motion.div>
        </div>
      </div>

      {!reduce && (
        <motion.div
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-fog/80"
          >
            <span className="text-[0.55rem] tracking-[0.35em] uppercase">Scroll</span>
            <span className="h-8 w-px bg-gradient-to-b from-fog/60 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

function FeaturedVideoBackground({
  src,
  poster,
  reduce,
  y,
  scale,
}: {
  src: string;
  poster: string | null;
  reduce: boolean | null;
  y: MotionValue<string>;
  scale: MotionValue<number>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [src]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video || reduce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    video.play().catch(() => {});
    return () => observer.disconnect();
  }, [reduce, src]);

  return (
    <motion.div ref={sectionRef} style={{ y, scale }} className="absolute inset-0">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted
        loop
        playsInline
        autoPlay={!reduce}
        preload="metadata"
        onCanPlay={() => setReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      {!ready && poster && (
        <Image src={poster} alt="" fill priority className="object-cover" sizes="100vw" />
      )}
    </motion.div>
  );
}

function HeroScrim({ overlayOpacity }: { overlayOpacity: MotionValue<number> }) {
  return (
    <>
      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/50 via-transparent to-ink/30" />
      <div className="cinematic-overlay absolute inset-0" />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.45]" />
    </>
  );
}

export function VolumeHero({
  volume,
  canApply,
  featuredVideoUrl,
  frameCount = 0,
  castCount = 0,
  videoCount = 0,
}: {
  volume: SessionVolumeDTO;
  canApply: boolean;
  hasTrailer?: boolean;
  featuredVideoUrl?: string | null;
  frameCount?: number;
  castCount?: number;
  videoCount?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.75, 0.96]);

  const artwork = volume.bannerImage || resolveSessionPosterImage(volume);
  const useFeaturedVideo = !!featuredVideoUrl;
  const [filmOpen, setFilmOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: volume.title, text: volume.subtitle || volume.theme, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel("Link Copied");
      setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <>
      <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden">
        {useFeaturedVideo ? (
          <FeaturedVideoBackground
            src={featuredVideoUrl}
            poster={artwork}
            reduce={reduce}
            y={y}
            scale={scale}
          />
        ) : (
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
        )}

        <HeroScrim overlayOpacity={overlayOpacity} />
        <HeroOverlay
          volume={volume}
          canApply={canApply}
          reduce={reduce}
          frameCount={frameCount}
          castCount={castCount}
          videoCount={videoCount}
          hasFeaturedFilm={useFeaturedVideo}
          onWatchFilm={() => setFilmOpen(true)}
          onShare={handleShare}
          shareLabel={shareLabel}
        />
      </section>

      <VolumeFilmPlayer
        url={featuredVideoUrl ?? null}
        title={volume.title}
        poster={artwork}
        open={filmOpen}
        onClose={() => setFilmOpen(false)}
      />
    </>
  );
}
