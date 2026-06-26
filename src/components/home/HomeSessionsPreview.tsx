"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { HomepageSectionCopy, SessionVolumeDTO } from "@/lib/types";
import { isApplicationsOpen, resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { Button } from "@/components/ui/Button";

export function HomeSessionsPreview({
  volume,
  copy,
}: {
  volume: SessionVolumeDTO;
  copy: HomepageSectionCopy;
}) {
  const poster = resolveSessionPosterImage(volume);
  const canApply = isApplicationsOpen(volume);
  const synopsis =
    volume.synopsis.split("\n").filter(Boolean)[0] || volume.subtitle || volume.theme;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-2xl"
        >
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg">{copy.headline}</h2>
          {copy.subheadline && <p className="body-lg mt-4 text-fog">{copy.subheadline}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14"
        >
          <Link
            href={`/sessions/${volume.slug}`}
            className="group relative aspect-[2/3] overflow-hidden bg-charcoal lg:col-span-5"
          >
            {poster ? (
              <Image
                src={poster}
                alt={volume.posterImageAlt || volume.title}
                fill
                className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
            )}
            <div className="absolute inset-0 bg-ink/20 transition-colors group-hover:bg-ink/35" />
          </Link>

          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.2em] text-muted uppercase">
                Vol. {volume.volumeNumber}
              </span>
              {volume.theme && (
                <span className="text-xs tracking-wide text-fog">{volume.theme}</span>
              )}
            </div>
            <h3 className="headline-lg mt-5">{volume.title}</h3>
            {volume.subtitle && (
              <p className="mt-3 font-display text-xl text-accent md:text-2xl">{volume.subtitle}</p>
            )}
            <p className="body-lg mt-6 max-w-xl text-fog">{synopsis}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="primary" href={`/sessions/${volume.slug}`}>
                Explore Volume
              </Button>
              {canApply && (
                <Button variant="secondary" href={`/sessions/${volume.slug}/apply`}>
                  Apply Now
                </Button>
              )}
            </div>
            <Link
              href="/sessions"
              className="label-caps link-underline mt-8 inline-block text-fog hover:text-cream"
            >
              Explore all sessions →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
