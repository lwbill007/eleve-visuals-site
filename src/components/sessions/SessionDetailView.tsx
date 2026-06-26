import Image from "next/image";
import Link from "next/link";
import type { SessionVolumeDTO } from "@/lib/types";
import type { SessionsApplicationContent } from "@/lib/types";
import {
  getSessionCtaMessage,
  resolveSessionPosterImage,
} from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { SessionCountdown } from "@/components/sessions/SessionCountdown";

export function SessionDetailView({
  volume,
  applicationContent: _applicationContent,
  canApply,
}: {
  volume: SessionVolumeDTO;
  applicationContent: SessionsApplicationContent;
  canApply: boolean;
}) {
  const heroImage = volume.bannerImage || resolveSessionPosterImage(volume);
  const gallery = [...volume.gallery, ...volume.moodBoard].filter(
    (url, i, arr) => arr.indexOf(url) === i
  );

  const metadata = [
    { label: "Volume", value: `Vol. ${volume.volumeNumber}` },
    { label: "Theme", value: volume.theme },
    { label: "Genre", value: volume.genre },
    { label: "Date", value: volume.sessionDate },
    { label: "Time", value: volume.sessionTime },
    { label: "City", value: volume.city || volume.location },
    { label: "Capacity", value: volume.capacity },
    { label: "Dress Code", value: volume.dressCode },
    { label: "Creative Director", value: volume.creativeDirector },
    { label: "Runtime", value: volume.runtime },
  ].filter((item) => item.value);

  return (
    <>
      <section className="relative flex min-h-[75vh] items-end">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={volume.bannerImageAlt || volume.posterImageAlt || volume.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
        )}
        <div className="cinematic-overlay absolute inset-0 bg-ink/75" />
        <div className="grain relative z-10 w-full section-padding pb-14 pt-28">
          <div className="container-wide">
            <Link href="/sessions" className="label-caps mb-6 inline-block text-fog hover:text-cream">
              ← All Sessions
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <SessionStatusBadge status={volume.status} />
              <span className="text-xs tracking-[0.15em] text-muted uppercase">
                ÉLEVÉ Sessions Vol. {volume.volumeNumber} · {volume.year}
              </span>
            </div>
            <p className="label-caps mt-4 text-accent">{volume.theme}</p>
            <h1 className="headline-xl mt-2 max-w-4xl">{volume.title}</h1>
            {volume.subtitle && (
              <p className="mt-4 max-w-2xl font-display text-2xl text-cream-dim md:text-3xl">
                {volume.subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="section-padding border-b border-stone/30">
        <div className="container-wide grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="label-caps mb-4 text-fog">Synopsis</h2>
            <div className="space-y-5">
              {volume.synopsis.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="body-lg text-fog">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="border border-stone/40 p-8">
              <h2 className="label-caps mb-6">Production Details</h2>
              <dl className="space-y-4">
                {metadata.map((item) => (
                  <div key={item.label} className="border-b border-stone/20 pb-3 last:border-0">
                    <dt className="text-[0.65rem] tracking-[0.15em] text-muted uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm text-cream">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {volume.applicationDeadline && canApply && (
                <div className="mt-6 border-t border-stone/20 pt-6">
                  <SessionCountdown deadline={volume.applicationDeadline} />
                </div>
              )}
              <div className="mt-8">
                {canApply ? (
                  <Button href={`/sessions/${volume.slug}/apply`} className="w-full">
                    Apply for This Session
                  </Button>
                ) : (
                  <p className="text-center text-sm tracking-wide text-fog uppercase">
                    {getSessionCtaMessage(volume.status)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {volume.teaserVideoUrl && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide">
            <h2 className="label-caps mb-6 text-fog">Teaser</h2>
            <div className="relative aspect-video overflow-hidden bg-charcoal">
              {volume.teaserVideoUrl.includes("youtube.com") ||
              volume.teaserVideoUrl.includes("youtu.be") ? (
                <iframe
                  src={volume.teaserVideoUrl.replace("watch?v=", "embed/")}
                  title={`${volume.title} teaser`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={volume.teaserVideoUrl}
                  controls
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide">
            <h2 className="label-caps mb-8 text-fog">Gallery</h2>
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {gallery.map((src, i) => (
                <div key={`${src}-${i}`} className="relative mb-4 aspect-[4/5] break-inside-avoid overflow-hidden bg-charcoal">
                  <Image
                    src={src}
                    alt={`${volume.title} — image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {volume.requirements.length > 0 && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-narrow">
            <h2 className="headline-md mb-6">Who Should Apply</h2>
            <ul className="space-y-3">
              {volume.requirements.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-fog">
                  <span className="text-accent">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {volume.timeline.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-narrow">
            <h2 className="headline-md mb-10 text-center">Timeline</h2>
            <div className="space-y-0">
              {volume.timeline.map((step, i) => (
                <div key={step.label} className="relative flex gap-6 pb-10 last:pb-0">
                  {i < volume.timeline.length - 1 && (
                    <span className="absolute top-6 left-[11px] h-full w-px bg-stone/40" />
                  )}
                  <span className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border border-accent bg-ink" />
                  <div>
                    <p className="text-sm text-cream">{step.label}</p>
                    {step.detail && <p className="mt-1 text-xs text-fog">{step.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {canApply && (
        <section id="apply" className="section-padding bg-ink-soft">
          <div className="container-narrow text-center">
            <h2 className="headline-md mb-4">Apply for Vol. {volume.volumeNumber}</h2>
            <p className="body-lg mx-auto mb-8 max-w-xl text-fog">
              Applications for <span className="text-cream">{volume.title}</span> are open.
              Complete the curated application to be considered for this production.
            </p>
            {volume.applicationDeadline && (
              <p className="mb-8 text-sm text-muted">
                Deadline: <SessionCountdown deadline={volume.applicationDeadline} />
              </p>
            )}
            <Button href={`/sessions/${volume.slug}/apply`} size="lg">
              Begin Application
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
