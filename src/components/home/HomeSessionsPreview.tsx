"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomepageSectionCopy, SessionVolumeDTO } from "@/lib/types";
import { isApplicationsOpen, resolveSessionPosterImage } from "@/lib/session-volume";
import { getSessionStatusLabel } from "@/lib/session-volume";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeSessionsPreview({
  volume,
  copy,
}: {
  volume: SessionVolumeDTO;
  copy: HomepageSectionCopy;
}) {
  const poster = resolveSessionPosterImage(volume);
  const featureImage = volume.bannerImage || poster;
  const canApply = isApplicationsOpen(volume);
  const synopsis =
    volume.synopsis.split("\n").filter(Boolean)[0] || volume.subtitle || volume.theme;

  return (
    <section className="section-padding border-b border-ink/15 bg-cream text-ink">
      <div className="container-wide">
        <div className="grid gap-10 border-t border-ink/70 pt-6 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4 lg:pr-8">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.24em] text-ink/55">
              {copy.eyebrow || "ÉLEVÉ Sessions"}
            </p>
            <h2 className="mt-5 font-display text-[clamp(3rem,5.5vw,5.8rem)] leading-[0.9] tracking-[-0.04em]">
              {copy.headline === "Limited volumes. Cinematic standards."
                ? "The experimental ten percent."
                : copy.headline}
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-ink/65 md:text-base">
              {copy.subheadline}
            </p>
            <div className="mt-8 border-t border-accent-dim/60 pt-5">
              <p className="font-display text-3xl italic md:text-4xl">
                Vol. {volume.volumeNumber} — {volume.title}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/55">
                {getSessionStatusLabel(volume.status)}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink/65">{synopsis}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href={`/sessions/${volume.slug}`}
                className="inline-flex min-h-11 items-center border-b border-ink text-xs font-medium tracking-[0.16em] uppercase"
              >
                Explore the volume
              </Link>
              {canApply ? (
                <Link
                  href={`/sessions/${volume.slug}/apply`}
                  className="inline-flex min-h-11 items-center border-b border-ink text-xs font-medium tracking-[0.16em] uppercase"
                >
                  Apply now
                </Link>
              ) : null}
            </div>
          </div>

          <Link
            href={`/sessions/${volume.slug}`}
            onClick={() =>
              trackEngagement({
                event: "cta_click",
                path: "/",
                label: `featured_session_${volume.slug}`,
              })
            }
            className="group relative aspect-[16/10] overflow-hidden bg-charcoal lg:col-span-8"
          >
            {featureImage ? (
              <Image
                src={featureImage}
                alt={volume.bannerImageAlt || volume.posterImageAlt || volume.title}
                fill
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            ) : (
              <div className="absolute inset-0 bg-charcoal" />
            )}
            <div className="absolute inset-0 bg-ink/10 transition-colors group-hover:bg-ink/20" />
          </Link>
        </div>
      </div>
    </section>
  );
}
