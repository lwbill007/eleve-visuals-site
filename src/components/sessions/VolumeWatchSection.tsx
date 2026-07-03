"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { buildWatchRail, type WatchRailItem } from "@/lib/volume-watch";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { VolumeFilmPlayer } from "./VolumeFilmPlayer";

function WatchCard({
  item,
  poster,
  index,
  onPlay,
}: {
  item: WatchRailItem;
  poster: string | null;
  index: number;
  onPlay: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, x: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
      className="group w-[min(85vw,28rem)] shrink-0 snap-start sm:w-[32rem]"
    >
      <button
        type="button"
        onClick={onPlay}
        className="relative block w-full overflow-hidden rounded-sm border border-stone/30 bg-charcoal text-left transition-colors hover:border-accent/50"
      >
        <div className="relative aspect-[21/9] w-full overflow-hidden">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 85vw, 32rem"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center opacity-90 transition-opacity group-hover:opacity-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cream/50 bg-ink/40 backdrop-blur-sm">
              <span className="ml-1 border-y-[9px] border-l-[14px] border-y-transparent border-l-cream" />
            </span>
          </span>
          {item.kind === "featured" && (
            <span className="absolute top-3 left-3 rounded bg-accent px-2 py-0.5 text-[0.6rem] font-semibold tracking-[0.15em] text-ink uppercase">
              Featured
            </span>
          )}
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-[0.65rem] tracking-[0.2em] text-accent uppercase">{item.subtitle}</p>
          <h3 className="mt-1 font-display text-xl text-cream sm:text-2xl">{item.title}</h3>
        </div>
      </button>
    </motion.article>
  );
}

export function VolumeWatchSection({ volume }: { volume: SessionVolumeDTO }) {
  const items = buildWatchRail(volume);
  const [playing, setPlaying] = useState<WatchRailItem | null>(null);
  const poster = resolveSessionPosterImage(volume);

  if (items.length === 0) return null;

  return (
    <section id="watch" className="section-padding overflow-hidden border-b border-stone/30 bg-ink">
      <div className="container-wide min-w-0">
        <header className="mb-8 sm:mb-10">
          <p className="label-caps text-accent">Now Streaming</p>
          <h2 className="headline-md mt-2 text-balance">Watch Film</h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            The complete Volume experience — film, trailer, and behind-the-scenes.
          </p>
        </header>

        <div className="-mx-[clamp(1.25rem,4vw,3rem)] flex gap-4 overflow-x-auto px-[clamp(1.25rem,4vw,3rem)] pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, i) => (
            <WatchCard
              key={item.id}
              item={item}
              poster={poster}
              index={i}
              onPlay={() => setPlaying(item)}
            />
          ))}
        </div>
      </div>

      <VolumeFilmPlayer
        url={playing?.url ?? null}
        title={playing?.title ?? volume.title}
        poster={poster}
        open={!!playing}
        onClose={() => setPlaying(null)}
      />
    </section>
  );
}
