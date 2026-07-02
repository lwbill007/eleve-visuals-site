import type {
  SessionVolumeDTO,
  SessionsApplicationContent,
  CastAppearance,
  CastMemberDTO,
} from "@/lib/types";
import { getSessionCtaMessage, getSessionStatusLabel } from "@/lib/session-volume";
import { castDisplayName } from "@/lib/cast";
import { toVideoEmbed } from "@/lib/video-embed";
import { Button } from "@/components/ui/Button";
import { SessionCountdown } from "@/components/sessions/SessionCountdown";
import { VolumeHero } from "@/components/sessions/VolumeHero";
import { VolumeTrailer } from "@/components/sessions/VolumeTrailer";
import { VolumeGallery } from "@/components/sessions/VolumeGallery";
import { VolumeTimeline } from "@/components/sessions/VolumeTimeline";
import { VolumeAwards, type VolumeAwardEntry } from "@/components/sessions/VolumeAwards";
import { VolumeTestimonials } from "@/components/sessions/VolumeTestimonials";
import { RelatedVolumes } from "@/components/sessions/RelatedVolumes";
import { VolumeCast } from "@/components/sessions/VolumeCast";
import { VolumeCredits } from "@/components/sessions/VolumeCredits";
import type { LightboxItem } from "@/components/sessions/MediaLightbox";

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 border border-stone/40 px-5 py-4 text-sm text-cream transition-colors hover:border-accent hover:text-accent"
    >
      <span className="min-w-0 break-words">{label}</span>
      <span aria-hidden className="shrink-0">↗</span>
    </a>
  );
}

function isDirectAudio(url: string): boolean {
  return /\.(mp3|wav|m4a|ogg|aac|flac)(\?|#|$)/i.test(url);
}

function playlistEmbed(url: string): string | null {
  const spotify = url.match(/spotify\.com\/(playlist|album|track)\/([\w]+)/i);
  if (spotify) return `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`;
  if (/music\.apple\.com/i.test(url)) {
    return url.replace("music.apple.com", "embed.music.apple.com");
  }
  if (/youtube\.com\/(playlist|embed)|youtu\.be/i.test(url)) {
    const list = url.match(/[?&]list=([\w-]+)/i);
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list[1]}`;
  }
  return null;
}

export function SessionDetailView({
  volume,
  canApply,
  cast = [],
  appearances = {},
  acceptedCount = 0,
  recommended = [],
  comingSoon = [],
}: {
  volume: SessionVolumeDTO;
  applicationContent: SessionsApplicationContent;
  canApply: boolean;
  cast?: CastMemberDTO[];
  appearances?: Record<string, CastAppearance[]>;
  acceptedCount?: number;
  recommended?: SessionVolumeDTO[];
  comingSoon?: SessionVolumeDTO[];
}) {
  const productionInfo = [
    { label: "Volume", value: `Vol. ${volume.volumeNumber}` },
    { label: "Theme", value: volume.theme },
    { label: "Genre", value: volume.genre },
    { label: "Season", value: volume.season },
    { label: "Shoot Date", value: volume.sessionDate },
    { label: "Runtime", value: volume.runtime },
    { label: "Location", value: volume.city || volume.location },
    { label: "Creative Director", value: volume.creativeDirector },
    { label: "Mood", value: volume.mood },
    { label: "Dress Code", value: volume.dressCode },
    { label: "Difficulty", value: volume.difficulty },
    { label: "Accepted", value: acceptedCount > 0 ? String(acceptedCount) : "" },
    { label: "Status", value: getSessionStatusLabel(volume.status) },
    { label: "Gallery Delivery", value: volume.galleryDelivery },
  ].filter((item) => item.value);

  const galleryItems: LightboxItem[] = volume.gallery.map((src) => ({
    type: "image",
    src,
    alt: `${volume.title} — ${volume.theme}`,
  }));

  const btsItems: LightboxItem[] = [
    ...volume.btsGallery.map((src) => ({ type: "image" as const, src, alt: `${volume.title} — behind the scenes` })),
    ...volume.interviews.map((src) => ({ type: "video" as const, src, embed: toVideoEmbed(src), alt: `${volume.title} — interview` })),
    ...volume.videos.map((src) => ({ type: "video" as const, src, embed: toVideoEmbed(src), alt: `${volume.title} — clip` })),
  ];

  const moodboardItems: LightboxItem[] = volume.moodBoard.map((src) => ({
    type: "image",
    src,
    alt: `${volume.title} — moodboard`,
  }));

  const awardEntries: VolumeAwardEntry[] = cast.flatMap((m) =>
    m.awards.map((a) => ({
      ...a,
      winnerName: castDisplayName(m),
      winnerSlug: m.slug,
      winnerEnabled: m.enableProfile,
    }))
  );

  const hasCreativeVision =
    volume.creativeBrief || volume.directorsNote || volume.colorPalette.length > 0 || volume.inspirations.length > 0;

  return (
    <>
      <VolumeHero volume={volume} canApply={canApply} hasTrailer={!!volume.teaserVideoUrl} />

      {/* Production Information */}
      <section className="section-padding border-b border-stone/30 bg-ink-soft">
        <div className="container-wide">
          <p className="label-caps mb-8 text-fog">Production Information</p>
          <div className="grid grid-cols-2 gap-px border border-stone/20 bg-stone/20 sm:grid-cols-3 lg:grid-cols-4">
            {productionInfo.map((item) => (
              <div key={item.label} className="bg-ink p-5">
                <dt className="text-[0.6rem] tracking-[0.18em] text-muted uppercase">{item.label}</dt>
                <dd className="mt-2 text-sm break-words text-cream">{item.value}</dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official Synopsis */}
      {volume.synopsis && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-narrow">
            <p className="label-caps mb-6 text-accent">Official Synopsis</p>
            <div className="space-y-6">
              {volume.synopsis.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="font-display text-2xl leading-relaxed text-cream-dim text-balance md:text-3xl">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      <VolumeTrailer url={volume.teaserVideoUrl} title={volume.title} />

      <VolumeCast members={cast} appearances={appearances} volumeNumber={volume.volumeNumber} />

      <VolumeGallery
        title="Gallery"
        subtitle="Still frames from the production."
        items={galleryItems}
      />

      {/* Creative Vision */}
      {hasCreativeVision && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="label-caps mb-6 text-accent">Creative Vision</p>
              <div className="space-y-5">
                {(volume.creativeBrief || volume.directorsNote)
                  .split("\n")
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i} className="body-lg text-fog">{p}</p>
                  ))}
              </div>
              {volume.inspirations.length > 0 && (
                <div className="mt-10">
                  <p className="label-caps mb-4 text-fog">Inspirations & References</p>
                  <div className="flex flex-wrap gap-2">
                    {volume.inspirations.map((item) => (
                      <span key={item} className="rounded-full border border-stone/40 px-4 py-1.5 text-xs text-cream-dim">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {volume.colorPalette.length > 0 && (
              <div className="lg:col-span-5">
                <p className="label-caps mb-4 text-fog">Color Palette</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {volume.colorPalette.map((color) => (
                    <div key={color} className="overflow-hidden border border-stone/30">
                      <div className="h-20 w-full" style={{ backgroundColor: color }} />
                      <p className="bg-ink px-2 py-1.5 text-[0.65rem] tracking-wide text-muted uppercase">{color}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Behind the Scenes */}
      <VolumeGallery
        title="Behind the Scenes"
        subtitle="Process, candids, and the making of the Volume."
        items={btsItems}
        tone="soft"
      />

      {volume.productionNotes && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-narrow">
            <p className="label-caps mb-5 text-fog">Director&rsquo;s Commentary</p>
            <div className="space-y-4">
              {volume.productionNotes.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-fog">{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {volume.audio.length > 0 && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-narrow">
            <p className="label-caps mb-6 text-fog">Audio & Interviews</p>
            <div className="space-y-4">
              {volume.audio.map((src, i) =>
                isDirectAudio(src) ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio key={`${src}-${i}`} src={src} controls className="w-full" />
                ) : (
                  <a
                    key={`${src}-${i}`}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-stone/40 px-5 py-3 text-sm break-all text-cream hover:border-accent hover:text-accent"
                  >
                    Listen → {src}
                  </a>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Soundtrack */}
      {volume.playlistUrl && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-narrow">
            <p className="label-caps mb-6 text-accent">Soundtrack</p>
            {playlistEmbed(volume.playlistUrl) ? (
              <div className="overflow-hidden border border-stone/30">
                <iframe
                  src={playlistEmbed(volume.playlistUrl)!}
                  title={`${volume.title} soundtrack`}
                  className="h-80 w-full sm:h-[26rem]"
                  loading="lazy"
                  allow="encrypted-media; clipboard-write; autoplay"
                />
              </div>
            ) : (
              <a
                href={volume.playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-stone/40 px-5 py-3 text-sm text-cream hover:border-accent hover:text-accent"
              >
                Open the playlist →
              </a>
            )}
          </div>
        </section>
      )}

      <VolumeGallery title="Moodboard" subtitle="The visual language behind the Volume." items={moodboardItems} tone="soft" />

      <VolumeTimeline status={volume.status} />

      <VolumeAwards awards={awardEntries} />

      <VolumeCredits members={cast} volumeNumber={volume.volumeNumber} title={volume.title} />

      {/* Sponsors */}
      {volume.sponsors.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide text-center">
            <p className="label-caps mb-10 text-fog">Presented With</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
              {volume.sponsors.map((sponsor, i) => {
                const inner = sponsor.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logo} alt={sponsor.name} className="h-12 w-auto object-contain" />
                ) : (
                  <span className="font-display text-xl text-cream-dim">{sponsor.name}</span>
                );
                return sponsor.url ? (
                  <a key={i} href={sponsor.url} target="_blank" rel="noopener noreferrer" className="opacity-70 transition-opacity hover:opacity-100">
                    {inner}
                  </a>
                ) : (
                  <span key={i} className="opacity-80">{inner}</span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <VolumeTestimonials testimonials={volume.testimonials} />

      {/* Production Files & Resources */}
      {(volume.callSheet || volume.wardrobeGuide || volume.resources.length > 0) && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-narrow">
            <p className="label-caps mb-6 text-fog">Files & Resources</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {volume.wardrobeGuide && <ResourceLink href={volume.wardrobeGuide} label="Wardrobe Guide" />}
              {volume.callSheet && <ResourceLink href={volume.callSheet} label="Call Sheet" />}
              {volume.resources.map((r) => (
                <ResourceLink key={r.url} href={r.url} label={r.label} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {volume.faqs.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-narrow">
            <h2 className="headline-md mb-10 text-center">Frequently Asked</h2>
            <div className="divide-y divide-stone/30 border-y border-stone/30">
              {volume.faqs.map((faq, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-cream">
                    <span className="min-w-0 font-display text-lg break-words">{faq.question}</span>
                    <span className="shrink-0 text-accent transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {faq.answer.split("\n").filter(Boolean).map((p, j) => (
                      <p key={j} className="text-sm leading-relaxed text-fog">{p}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Apply CTA */}
      {canApply ? (
        <section id="apply" className="section-padding border-b border-stone/30 bg-ink">
          <div className="container-narrow text-center">
            <p className="label-caps mb-4 text-accent">The Casting Call</p>
            <h2 className="headline-lg mb-5">This could be your Volume.</h2>
            <p className="body-lg mx-auto mb-8 max-w-xl text-fog">
              Applications for <span className="text-cream">{volume.title}</span> are open. Complete the curated
              application to be considered for this production.
            </p>
            {volume.applicationDeadline && (
              <div className="mb-8">
                <SessionCountdown deadline={volume.applicationDeadline} />
              </div>
            )}
            <Button href={`/sessions/${volume.slug}/apply`} size="lg">
              Begin Application
            </Button>
          </div>
        </section>
      ) : (
        <section className="section-padding border-b border-stone/30 bg-ink">
          <div className="container-narrow text-center">
            <p className="text-sm tracking-[0.15em] text-fog uppercase">{getSessionCtaMessage(volume.status)}</p>
          </div>
        </section>
      )}

      <RelatedVolumes recommended={recommended} comingSoon={comingSoon} />
    </>
  );
}
