"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "./SessionStatusBadge";

export function VolumePosterCard({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);

  return (
    <motion.article whileHover={{ y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="group h-full">
      <Link href={`/sessions/${volume.slug}`} className="block h-full">
        <div className="relative aspect-[2/3] overflow-hidden bg-charcoal">
          {poster ? (
            <Image
              src={poster}
              alt={volume.posterImageAlt || volume.title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              sizes="(max-width: 480px) 60vw, (max-width: 768px) 40vw, (max-width: 1024px) 28vw, 22vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink-soft to-ink" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/15 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 ring-1 ring-inset ring-transparent transition-all duration-500 group-hover:ring-accent/40" />

          <div className="absolute top-3 left-3">
            <SessionStatusBadge status={volume.status} />
          </div>

          <div className="absolute right-0 bottom-0 left-0 p-4">
            <p className="text-[0.6rem] tracking-[0.2em] text-accent uppercase">
              Vol. {volume.volumeNumber} · {volume.year}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-xl leading-tight text-cream">{volume.title}</h3>
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-500 group-hover:grid-rows-[1fr] group-hover:opacity-100">
              <span className="overflow-hidden">
                <span className="mt-2 block text-[0.6rem] tracking-[0.2em] text-cream-dim uppercase">
                  View Volume →
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
