"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "./SessionStatusBadge";

export function SessionPosterCard({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);
  const excerpt =
    volume.subtitle || volume.synopsis.slice(0, 120) + (volume.synopsis.length > 120 ? "…" : "");

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/sessions/${volume.slug}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden bg-charcoal">
          {poster ? (
            <Image
              src={poster}
              alt={volume.posterImageAlt || volume.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink-soft to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-90" />
          <div className="absolute top-3 left-3">
            <SessionStatusBadge status={volume.status} />
          </div>
          <div className="absolute right-0 bottom-0 left-0 p-4">
            <p className="label-caps text-[0.55rem] text-accent">
              Vol. {volume.volumeNumber}
            </p>
            <h3 className="mt-1 font-display text-xl leading-tight text-cream">{volume.title}</h3>
            <p className="mt-1 text-xs text-fog">{volume.year}</p>
          </div>
        </div>
        {excerpt && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-fog">{excerpt}</p>
        )}
      </Link>
    </motion.article>
  );
}
