"use client";

import Image from "next/image";
import Link from "next/link";
import type { SessionVolumeDTO } from "@/lib/types";
import { getSessionStatusLabel, resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { SessionCountdown } from "@/components/sessions/SessionCountdown";

export function SessionApplicationHero({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);

  return (
    <section className="relative border-b border-stone/30 bg-ink-soft">
      <div className="container-wide section-padding">
        <Link href={`/sessions/${volume.slug}`} className="label-caps mb-8 inline-block text-fog hover:text-cream">
          ← Back to Vol. {volume.volumeNumber}
        </Link>

        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <div className="relative aspect-[2/3] max-w-sm overflow-hidden border border-stone/30 bg-charcoal">
              {poster ? (
                <Image
                  src={poster}
                  alt={volume.posterImageAlt || volume.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">No poster</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.15em] text-muted uppercase">
                Vol. {volume.volumeNumber} · {volume.theme}
              </span>
            </div>

            <p className="label-caps text-accent">Apply for ÉLEVÉ Sessions</p>
            <h1 className="headline-lg mt-3 max-w-2xl">Application — {volume.title}</h1>
            <p className="body-lg mt-6 max-w-2xl text-fog">
              Every ÉLEVÉ Session is intentionally curated. We review applications based on creativity,
              collaboration, professionalism, and fit with the concept—not popularity or follower count.
            </p>

            <dl className="mt-10 grid gap-4 sm:grid-cols-2">
              {volume.sessionDate && (
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Session date</dt>
                  <dd className="mt-1 text-cream">{volume.sessionDate}</dd>
                </div>
              )}
              {volume.applicationDeadline && (
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Application deadline</dt>
                  <dd className="mt-1 text-cream">
                    <SessionCountdown deadline={volume.applicationDeadline} />
                  </dd>
                </div>
              )}
              {volume.capacity && (
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Participants</dt>
                  <dd className="mt-1 text-cream">{volume.capacity}</dd>
                </div>
              )}
              {(volume.city || volume.location) && (
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Location</dt>
                  <dd className="mt-1 text-cream">{volume.city || volume.location}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs tracking-wide text-muted uppercase">Status</dt>
                <dd className="mt-1 text-cream">{getSessionStatusLabel(volume.status)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
