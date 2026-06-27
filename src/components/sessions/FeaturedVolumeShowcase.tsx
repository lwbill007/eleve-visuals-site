"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { SessionCountdown } from "./SessionCountdown";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  if (/youtube\.com\/embed\//i.test(url)) return url;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return null;
}

export function FeaturedVolumeShowcase({
  volume,
  canApply,
  spotsRemaining,
}: {
  volume: SessionVolumeDTO;
  canApply: boolean;
  spotsRemaining: number | null;
}) {
  const poster = resolveSessionPosterImage(volume);
  const [teaserOpen, setTeaserOpen] = useState(false);

  const teaserItem: LightboxItem | null = volume.teaserVideoUrl
    ? {
        type: "video",
        src: volume.teaserVideoUrl,
        embed: toEmbed(volume.teaserVideoUrl),
        alt: `${volume.title} teaser`,
      }
    : null;

  const stats = [
    { label: "Production", value: volume.sessionDate },
    {
      label: "Spots Remaining",
      value:
        spotsRemaining !== null
          ? spotsRemaining > 0
            ? `${spotsRemaining} left`
            : "Full"
          : volume.capacity,
    },
    { label: "Gallery Delivery", value: volume.galleryDelivery },
    { label: "Location", value: volume.city || volume.location },
  ].filter((s) => s.value);

  return (
    <section className="relative overflow-hidden border-b border-stone/30">
      {poster && (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <Image src={poster} alt="" fill className="object-cover blur-2xl" sizes="100vw" />
        </div>
      )}
      <div className="relative section-padding">
        <div className="container-wide">
          <div className="mb-10 flex items-center gap-4">
            <p className="label-caps text-accent">Featured Volume</p>
            <span className="h-px flex-1 bg-stone/40" />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div className="group relative aspect-[2/3] overflow-hidden bg-charcoal shadow-2xl shadow-black/50">
                {poster ? (
                  <Image
                    src={poster}
                    alt={volume.posterImageAlt || volume.title}
                    fill
                    priority
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                {teaserItem && (
                  <button
                    type="button"
                    onClick={() => setTeaserOpen(true)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Watch teaser"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-cream/40 bg-ink/40 backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-cream/70">
                      <span className="ml-1 border-y-[9px] border-l-[15px] border-y-transparent border-l-cream" />
                    </span>
                  </button>
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
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <SessionStatusBadge status={volume.status} />
                <span className="text-xs tracking-[0.15em] text-muted uppercase">
                  Vol. {volume.volumeNumber} · {volume.year}
                </span>
              </div>

              {volume.theme && <p className="label-caps mb-3 text-fog">{volume.theme}</p>}
              <h2 className="headline-lg text-balance">{volume.title}</h2>
              {volume.subtitle && (
                <p className="mt-4 font-display text-xl leading-snug text-accent md:text-2xl">
                  &ldquo;{volume.subtitle}&rdquo;
                </p>
              )}
              {volume.synopsis && (
                <p className="body-lg mt-6 max-w-xl text-fog">
                  {volume.synopsis.length > 320
                    ? `${volume.synopsis.slice(0, 320)}…`
                    : volume.synopsis}
                </p>
              )}

              {stats.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-stone/30 pt-8 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="text-[0.6rem] tracking-[0.18em] text-muted uppercase">
                        {s.label}
                      </dt>
                      <dd className="mt-1.5 text-sm text-cream">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {volume.applicationDeadline && canApply && (
                <div className="mt-6">
                  <SessionCountdown deadline={volume.applicationDeadline} />
                </div>
              )}

              {volume.directorsNote && (
                <blockquote className="mt-8 border-l-2 border-accent/50 pl-5">
                  <p className="text-[0.6rem] tracking-[0.18em] text-muted uppercase">
                    Director&rsquo;s Note
                  </p>
                  <p className="mt-2 font-display text-lg leading-relaxed text-cream-dim italic">
                    {volume.directorsNote}
                  </p>
                  {volume.creativeDirector && (
                    <footer className="mt-2 text-xs tracking-wide text-fog">
                      — {volume.creativeDirector}
                    </footer>
                  )}
                </blockquote>
              )}

              <div className="mt-10 flex flex-wrap gap-4">
                {canApply && (
                  <Button variant="primary" href={`/sessions/${volume.slug}/apply`}>
                    Apply
                  </Button>
                )}
                <Button variant="secondary" href={`/sessions/${volume.slug}`}>
                  Learn More
                </Button>
                {teaserItem && (
                  <button
                    type="button"
                    onClick={() => setTeaserOpen(true)}
                    className="link-underline self-center text-xs tracking-[0.15em] text-fog uppercase transition-colors hover:text-cream"
                  >
                    Watch Teaser
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {teaserItem && (
        <MediaLightbox
          items={[teaserItem]}
          index={teaserOpen ? 0 : null}
          onClose={() => setTeaserOpen(false)}
        />
      )}
    </section>
  );
}
