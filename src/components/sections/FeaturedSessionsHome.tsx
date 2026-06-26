import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { SessionVolumeDTO } from "@/lib/types";
import { isApplicationsOpen, resolveSessionPosterImage } from "@/lib/session-volume";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";

export function FeaturedSessionsHome({ volume }: { volume: SessionVolumeDTO }) {
  const poster = resolveSessionPosterImage(volume);
  const canApply = isApplicationsOpen(volume);

  return (
    <section className="section-padding border-y border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <p className="label-caps mb-4 text-accent">ÉLEVÉ Sessions</p>
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="relative aspect-[2/3] overflow-hidden bg-charcoal lg:col-span-5">
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
          <div className="lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.15em] text-muted uppercase">
                Vol. {volume.volumeNumber}
              </span>
            </div>
            <h2 className="headline-lg">{volume.title}</h2>
            {volume.subtitle && (
              <p className="mt-4 font-display text-xl text-accent">{volume.subtitle}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="primary" href={`/sessions/${volume.slug}`}>
                View Volume
              </Button>
              {canApply && (
                <Button variant="ghost" href={`/sessions/${volume.slug}/apply`}>
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
        </div>
      </div>
    </section>
  );
}
