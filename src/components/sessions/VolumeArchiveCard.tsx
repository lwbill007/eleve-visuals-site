"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "./SessionStatusBadge";

export function VolumeArchiveCard({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);
  const description =
    volume.subtitle ||
    volume.synopsis.split("\n").filter(Boolean)[0] ||
    volume.theme;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/sessions/${volume.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-charcoal">
          {poster ? (
            <Image
              src={poster}
              alt={volume.posterImageAlt || volume.title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-[1.4s] group-hover:scale-[1.05]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink-soft to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

          <div className="absolute top-4 left-4">
            <SessionStatusBadge status={volume.status} />
          </div>

          <div className="absolute right-0 bottom-0 left-0 p-6 md:p-8">
            <p className="label-caps text-accent">
              Vol. {volume.volumeNumber} · {volume.year}
            </p>
            <h3 className="mt-2 font-display text-3xl leading-tight text-cream md:text-4xl">
              {volume.title}
            </h3>
            {volume.theme && (
              <p className="mt-2 text-sm tracking-wide text-fog">{volume.theme}</p>
            )}
            {description && (
              <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-relaxed text-cream-dim/80">
                {description}
              </p>
            )}
            <span className="link-underline mt-5 inline-block text-xs tracking-[0.18em] text-cream uppercase">
              View Volume →
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
