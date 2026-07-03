"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toVideoEmbed } from "@/lib/video-embed";
import { SessionIcon } from "./SessionIcon";

export function VolumeTrailer({ url, title }: { url: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  const embed = url ? toVideoEmbed(url) : null;

  return (
    <section id="trailer" className="section-padding border-b border-stone/30 bg-ink">
      <div className="container-wide">
        <p className="label-caps mb-6 text-fog">Official Trailer</p>

        {!url ? (
          <div className="relative flex aspect-video items-center justify-center overflow-hidden border border-stone/30 bg-charcoal/40">
            <div className="grain pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative text-center">
              <SessionIcon name="film" className="mx-auto h-10 w-10 text-stone" />
              <p className="mt-4 font-display text-2xl text-cream-dim">Trailer Coming Soon</p>
              <p className="mt-2 text-sm text-muted">The teaser for this Volume is in post-production.</p>
            </div>
          </div>
        ) : embed ? (
          <div className="relative aspect-video overflow-hidden bg-charcoal">
            {playing ? (
              <iframe
                src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
                title={`${title} trailer`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex items-center justify-center"
                aria-label="Play trailer"
              >
                <iframe
                  src={embed}
                  title={`${title} trailer preview`}
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
                  tabIndex={-1}
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-ink/40 transition-colors group-hover:bg-ink/25" />
                <motion.span
                  whileHover={{ scale: 1.08 }}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cream/60 bg-ink/40 backdrop-blur-sm"
                >
                  <span className="ml-1 border-y-[11px] border-l-[18px] border-y-transparent border-l-cream" />
                </motion.span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden bg-charcoal">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain bg-ink"
            />
          </div>
        )}
      </div>
    </section>
  );
}
