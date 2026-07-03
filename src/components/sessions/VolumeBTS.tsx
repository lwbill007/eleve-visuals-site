"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import type { GalleryItem } from "@/components/gallery/types";
import type { SessionVolumeDTO } from "@/lib/types";
import { filenameFromVideoUrl } from "@/lib/volume-watch";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { VolumeFilmPlayer } from "./VolumeFilmPlayer";

function BtsVideoRow({
  url,
  label,
  onPlay,
}: {
  url: string;
  label: string;
  onPlay: (url: string, title: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(url, label)}
      className="group flex w-full min-w-0 items-center gap-4 border border-stone/30 bg-ink-soft/40 p-3 text-left transition-colors hover:border-accent/40 sm:p-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cream/40 bg-ink/60">
        <span className="ml-0.5 border-y-[6px] border-l-[9px] border-y-transparent border-l-cream" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base text-cream sm:text-lg">{label}</span>
        <span className="text-[0.65rem] tracking-[0.15em] text-muted uppercase">Play clip</span>
      </span>
    </button>
  );
}

export function VolumeBTS({
  volume,
  photoItems,
  videoUrls,
  interviewUrls,
}: {
  volume: SessionVolumeDTO;
  photoItems: GalleryItem[];
  videoUrls: string[];
  interviewUrls: string[];
}) {
  const reduce = useReducedMotion();
  const [player, setPlayer] = useState<{ url: string; title: string } | null>(null);
  const poster = resolveSessionPosterImage(volume);

  const featured = volume.featuredVideoUrl;
  const trailer = volume.teaserVideoUrl;
  const btsVideos = videoUrls.filter((u) => u !== featured && u !== trailer);
  const hasContent =
    photoItems.length > 0 || btsVideos.length > 0 || interviewUrls.length > 0 || volume.productionNotes;

  if (!hasContent) return null;

  return (
    <section id="bts" className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide min-w-0">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 max-w-2xl"
        >
          <p className="label-caps text-fog">Documentary</p>
          <h2 className="headline-md mt-2 text-balance">Behind the Scenes</h2>
          <p className="mt-3 text-sm text-muted">
            Crew moments, creative process, and the making of Vol. {volume.volumeNumber}.
          </p>
        </motion.header>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {photoItems.length > 0 && (
            <div>
              <h3 className="mb-4 text-[0.7rem] tracking-[0.25em] text-cream-dim uppercase">Crew Moments</h3>
              <GalleryMasonry items={photoItems} variant="embedded" columns="narrow" showCount={false} />
            </div>
          )}

          <div className="space-y-10">
            {btsVideos.length > 0 && (
              <div>
                <h3 className="mb-4 text-[0.7rem] tracking-[0.25em] text-cream-dim uppercase">On Set</h3>
                <div className="space-y-2">
                  {btsVideos.map((url) => (
                    <BtsVideoRow
                      key={url}
                      url={url}
                      label={filenameFromVideoUrl(url)}
                      onPlay={(u, t) => setPlayer({ url: u, title: t })}
                    />
                  ))}
                </div>
              </div>
            )}

            {interviewUrls.length > 0 && (
              <div>
                <h3 className="mb-4 text-[0.7rem] tracking-[0.25em] text-cream-dim uppercase">Interviews</h3>
                <div className="space-y-2">
                  {interviewUrls.map((url) => (
                    <BtsVideoRow
                      key={url}
                      url={url}
                      label={filenameFromVideoUrl(url)}
                      onPlay={(u, t) => setPlayer({ url: u, title: t })}
                    />
                  ))}
                </div>
              </div>
            )}

            {volume.productionNotes && (
              <div>
                <h3 className="mb-4 text-[0.7rem] tracking-[0.25em] text-cream-dim uppercase">Production Journal</h3>
                <div className="border-l-2 border-accent/40 pl-5">
                  {volume.productionNotes.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} className="mb-4 text-sm leading-relaxed text-fog last:mb-0">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <VolumeFilmPlayer
        url={player?.url ?? null}
        title={player?.title ?? volume.title}
        poster={poster}
        open={!!player}
        onClose={() => setPlayer(null)}
      />
    </section>
  );
}
