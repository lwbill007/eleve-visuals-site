"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

export function FeaturedSpotlight({
  volume,
  canApply,
  spotsRemaining,
}: {
  volume: SessionVolumeDTO;
  canApply: boolean;
  spotsRemaining: number | null;
}) {
  const poster = resolveSessionPosterImage(volume);
  const moodboard = volume.moodBoard.slice(0, 4);
  const vision = volume.synopsis.split("\n").filter(Boolean);

  const details = [
    { label: "Production", value: volume.sessionDate },
    { label: "Location", value: volume.city || volume.location },
    { label: "Wardrobe", value: volume.dressCode },
    {
      label: "Spots",
      value:
        spotsRemaining !== null
          ? spotsRemaining > 0
            ? `${spotsRemaining} remaining`
            : "Cast full"
          : volume.capacity,
    },
  ].filter((d) => d.value);

  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-12 flex items-center gap-4">
          <p className="label-caps text-accent">
            {canApply ? "Now Casting" : "Featured Production"}
          </p>
          <span className="h-px flex-1 bg-stone/40" />
          <span className="text-xs tracking-[0.18em] text-muted uppercase">Vol. {volume.volumeNumber}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="lg:col-span-5"
          >
            <div className="lg:sticky lg:top-28">
              <div className="relative aspect-[2/3] overflow-hidden bg-charcoal shadow-2xl shadow-black/50">
                {poster ? (
                  <Image
                    src={poster}
                    alt={volume.posterImageAlt || volume.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                )}
              </div>
              {moodboard.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {moodboard.map((src, i) => (
                    <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden bg-charcoal">
                      <Image
                        src={src}
                        alt={`${volume.title} moodboard ${i + 1}`}
                        fill
                        loading="lazy"
                        className="object-cover"
                        sizes="100px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="lg:col-span-7"
          >
            <motion.div variants={fade} className="mb-4 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              {volume.theme && (
                <span className="text-xs tracking-[0.18em] text-fog uppercase">{volume.theme}</span>
              )}
              {volume.genre && (
                <span className="text-xs tracking-[0.18em] text-muted uppercase">{volume.genre}</span>
              )}
            </motion.div>

            <motion.h3 variants={fade} className="headline-lg text-balance">
              {volume.title}
            </motion.h3>
            {volume.subtitle && (
              <motion.p variants={fade} className="mt-4 font-display text-xl text-accent md:text-2xl">
                &ldquo;{volume.subtitle}&rdquo;
              </motion.p>
            )}

            {vision.length > 0 && (
              <motion.div variants={fade} className="mt-8">
                <p className="label-caps mb-3 text-fog">The Vision</p>
                <div className="space-y-4">
                  {vision.slice(0, 3).map((p, i) => (
                    <p key={i} className="body-lg">{p}</p>
                  ))}
                </div>
              </motion.div>
            )}

            {volume.directorsNote && (
              <motion.blockquote variants={fade} className="mt-8 border-l-2 border-accent/50 pl-5">
                <p className="text-[0.6rem] tracking-[0.18em] text-muted uppercase">Director&rsquo;s Note</p>
                <p className="mt-2 font-display text-lg leading-relaxed text-cream-dim italic">
                  {volume.directorsNote}
                </p>
              </motion.blockquote>
            )}

            {volume.requirements.length > 0 && (
              <motion.div variants={fade} className="mt-8">
                <p className="label-caps mb-3 text-fog">Who We&rsquo;re Looking For</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {volume.requirements.map((r) => (
                    <li key={r} className="flex gap-3 text-sm text-fog">
                      <span className="text-accent">—</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {details.length > 0 && (
              <motion.dl
                variants={fade}
                className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-stone/30 pt-8 sm:grid-cols-4 sm:gap-x-8"
              >
                {details.map((d) => (
                  <div key={d.label} className="min-w-0">
                    <dt className="text-[0.6rem] tracking-[0.18em] text-muted uppercase">{d.label}</dt>
                    <dd className="mt-1.5 text-sm break-words text-cream">{d.value}</dd>
                  </div>
                ))}
              </motion.dl>
            )}

            {volume.applicationDeadline && canApply && (
              <motion.div variants={fade} className="mt-6">
                <SessionCountdown deadline={volume.applicationDeadline} />
              </motion.div>
            )}

            <motion.div variants={fade} className="mt-10 flex flex-wrap gap-4">
              {canApply && (
                <Button variant="primary" href={`/sessions/${volume.slug}/apply`}>
                  Apply for This Volume
                </Button>
              )}
              <Button variant="secondary" href={`/sessions/${volume.slug}`}>
                See the Full Brief
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
