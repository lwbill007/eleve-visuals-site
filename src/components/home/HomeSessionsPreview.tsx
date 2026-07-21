"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomepageSectionCopy, SessionVolumeDTO } from "@/lib/types";
import { isApplicationsOpen, resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { Button } from "@/components/ui/Button";
import { trackEngagement } from "@/lib/analytics-client";

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
        <div className="mb-12 grid gap-6 border-t border-stone/50 pt-6 md:grid-cols-12 md:items-end md:mb-16">
          <div className="md:col-span-8">
            {copy.eyebrow ? <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p> : null}
            <h2 className="font-display text-[clamp(2.8rem,5vw,5.75rem)] leading-[0.94] tracking-[-0.035em]">
              {copy.headline}
            </h2>
          </div>
          {copy.subheadline ? (
            <p className="text-sm leading-relaxed text-fog md:col-span-4 md:pb-2 md:text-base">
              {copy.subheadline}
            </p>
          ) : null}
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Link
            href={`/sessions/${volume.slug}`}
            onClick={() =>
              trackEngagement({
                event: "cta_click",
                path: "/",
                label: `featured_session_${volume.slug}`,
              })
            }
            className="group relative aspect-[3/4] overflow-hidden bg-charcoal lg:col-span-5 lg:max-h-[700px]"
          >
            {poster ? (
              <Image
                src={poster}
                alt={volume.posterImageAlt || volume.title}
                fill
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
            )}
            <div className="absolute inset-0 bg-ink/20 transition-colors group-hover:bg-ink/35" />
          </Link>

          <div className="lg:col-span-7 lg:pl-4">
            <div className="flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.2em] text-muted uppercase">
                Vol. {volume.volumeNumber}
              </span>
              {volume.theme && (
                <span className="text-xs tracking-wide text-fog">{volume.theme}</span>
              )}
            </div>
            <h3 className="mt-6 max-w-2xl font-display text-[clamp(3rem,5.5vw,6rem)] leading-[0.9] tracking-[-0.04em]">
              {volume.title}
            </h3>
            {volume.subtitle && (
              <p className="mt-3 font-display text-xl text-accent md:text-2xl">{volume.subtitle}</p>
            )}
            <p className="body-lg mt-6 max-w-xl text-fog">{synopsis}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                variant="primary"
                href={`/sessions/${volume.slug}`}
                onClick={() =>
                  trackEngagement({
                    event: "cta_click",
                    path: "/",
                    label: `featured_session_explore_${volume.slug}`,
                  })
                }
              >
                Explore Volume
              </Button>
              {canApply && (
                <Button
                  variant="secondary"
                  href={`/sessions/${volume.slug}/apply`}
                  onClick={() =>
                    trackEngagement({
                      event: "cta_click",
                      path: "/",
                      label: `featured_session_apply_${volume.slug}`,
                    })
                  }
                >
                  Apply Now
                </Button>
              )}
            </div>
            <Link
              href="/sessions"
              onClick={() =>
                trackEngagement({ event: "cta_click", path: "/", label: "featured_session_all" })
              }
              className="label-caps link-underline mt-8 inline-block text-fog hover:text-cream"
            >
              Explore all sessions →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
