"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { isApplicationsOpen, resolveSessionPosterImage } from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";

export function FeaturedSession({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);
  const canApply = isApplicationsOpen(volume);

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <p className="label-caps mb-8 text-accent">Featured Volume</p>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-charcoal shadow-2xl shadow-black/40">
              {poster ? (
                <Image
                  src={poster}
                  alt={volume.posterImageAlt || volume.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.15em] text-muted uppercase">
                ÉLEVÉ Sessions Vol. {volume.volumeNumber}
              </span>
            </div>
            <p className="label-caps mb-3 text-fog">{volume.theme}</p>
            <h2 className="headline-lg text-balance">{volume.title}</h2>
            {volume.subtitle && (
              <p className="mt-4 font-display text-xl leading-snug text-accent md:text-2xl">
                &ldquo;{volume.subtitle}&rdquo;
              </p>
            )}
            {volume.synopsis && (
              <p className="body-lg mt-6 max-w-xl text-fog">
                {volume.synopsis.length > 280
                  ? `${volume.synopsis.slice(0, 280)}…`
                  : volume.synopsis}
              </p>
            )}
            {volume.applicationDeadline && canApply && (
              <div className="mt-6">
                <SessionCountdown deadline={volume.applicationDeadline} />
              </div>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <Button variant="primary" href={`/sessions/${volume.slug}`}>
                View Details
              </Button>
              {canApply && (
                <Button variant="ghost" href={`/sessions/${volume.slug}#apply`}>
                  Apply Now
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
