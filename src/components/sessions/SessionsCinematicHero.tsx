"use client";

import { useState } from "react";
import Image from "next/image";
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
  const [trailerOpen, setTrailerOpen] = useState(false);

  const backdrop = (volume ? volume.bannerImage || resolveSessionPosterImage(volume) : null) || fallbackPoster;
  const alt = volume ? volume.bannerImageAlt || volume.posterImageAlt || volume.title : fallbackAlt;

  const teaser: LightboxItem | null = volume?.teaserVideoUrl
    ? { type: "video", src: volume.teaserVideoUrl, embed: toVideoEmbed(volume.teaserVideoUrl), alt: `${volume.title} trailer` }
    : null;

  const tagline = volume?.subtitle || volume?.theme || "An ongoing series of cinematic creative productions.";

  return (
    <section className="relative flex min-h-[78dvh] items-end overflow-hidden bg-ink md:min-h-[88dvh]">
      <div className="absolute inset-0">
        {backdrop ? (
          <Image
            src={backdrop}
            alt={alt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
        )}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.97)_0%,rgba(7,7,7,0.82)_42%,rgba(7,7,7,0.18)_76%),linear-gradient(0deg,rgba(7,7,7,0.98)_0%,transparent_55%)]" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full px-5 pb-12 pt-32 sm:px-8 md:pb-20 lg:px-12">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="label-caps mb-5 text-accent">
              {volume ? `Featured premiere · Vol. ${volume.volumeNumber}` : "ÉLEVÉ Originals"}
            </p>

            {volume ? (
              <div className="mb-5 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              {volume.theme && (
                <span className="text-xs tracking-[0.18em] text-cream-dim/80 uppercase">{volume.theme}</span>
              )}
              </div>
            ) : null}

            <h1 className="max-w-4xl font-display text-[clamp(4rem,8vw,8.5rem)] leading-[0.86] tracking-[-0.05em] text-balance text-cream">
              {volume ? volume.title : "ÉLEVÉ Sessions"}
            </h1>

            <p className="mt-6 max-w-xl font-display text-xl leading-snug text-cream-dim md:text-2xl">
              {tagline}
            </p>

            {volume?.applicationDeadline && canApply ? (
              <div className="mt-6">
              <SessionCountdown deadline={volume.applicationDeadline} />
              </div>
            ) : null}

            <div className="mt-9 flex flex-wrap items-center gap-4">
              {volume && canApply ? (
                <Button variant="primary" size="lg" href={`/sessions/${volume.slug}/apply`}>
                  Apply for Vol. {volume.volumeNumber}
                </Button>
              ) : (
                <Button variant="primary" size="lg" href="#browse">
                  Browse Volumes
                </Button>
              )}
              {teaser ? (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="group inline-flex min-h-12 items-center gap-3 px-1 text-xs tracking-[0.18em] text-cream uppercase"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:border-cream/80">
                    <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-cream" />
                  </span>
                  Watch trailer
                </button>
              ) : null}
              {volume ? (
                <Button variant="ghost" size="lg" href={`/sessions/${volume.slug}`}>
                  View details
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {teaser && (
        <MediaLightbox items={[teaser]} index={trailerOpen ? 0 : null} onClose={() => setTrailerOpen(false)} />
      )}
    </section>
  );
}
