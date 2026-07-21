import Image from "next/image";
import Link from "next/link";

export interface Spotlight {
  name: string;
  role: string;
  image?: string | null;
  volume?: string;
  slug?: string;
  profileEnabled?: boolean;
}

export interface CommunityTestimonial {
  quote: string;
  name: string;
  role?: string;
}

export function SessionsCommunity({
  spotlights = [],
  testimonials = [],
}: {
  spotlights?: Spotlight[];
  testimonials?: CommunityTestimonial[];
}) {
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Circle</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">Once you&rsquo;re in, you&rsquo;re in</h2>
          <p className="body-lg mt-5">
            Every creative cast into a Volume becomes part of the ÉLEVÉ circle — a growing community
            of photographers, models, stylists, and artists who keep building together long after
            the shoot wraps.
          </p>
          <Link
            href="/alumni"
            className="mt-6 inline-block text-xs tracking-[0.15em] text-accent uppercase hover:text-cream"
          >
            Meet the alumni →
          </Link>
        </div>

        {spotlights.length > 0 && (
          <div className="mb-14 grid grid-cols-2 gap-5 md:grid-cols-4">
            {spotlights.map((p, i) => {
              const figure = (
                <>
                  <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                  </div>
                  <figcaption className="mt-3">
                    <p className="text-sm break-words text-cream">{p.name}</p>
                    <p className="text-xs text-fog">{p.role}</p>
                    {p.volume && <p className="mt-0.5 text-[0.65rem] tracking-wide text-muted">{p.volume}</p>}
                    {p.profileEnabled && p.slug && (
                      <p className="mt-1 text-[0.65rem] tracking-wide text-accent">View profile →</p>
                    )}
                  </figcaption>
                </>
              );

              return (
                <figure
                  key={`${p.slug || p.name}-${i}`}
                  className="group"
                >
                  {p.profileEnabled && p.slug ? (
                    <Link href={`/sessions/cast/${p.slug}`} className="block">
                      {figure}
                    </Link>
                  ) : (
                    figure
                  )}
                </figure>
              );
            })}
          </div>
        )}

        {testimonials.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <blockquote
                key={`${t.name}-${i}`}
                className="border border-stone/40 bg-charcoal/30 p-7"
              >
                <p className="font-display text-lg leading-relaxed text-cream-dim italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-4 text-xs tracking-wide text-fog">
                  {t.name}
                  {t.role && <span className="text-muted"> · {t.role}</span>}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : (
          <div className="border border-stone/40 bg-charcoal/20 p-8 md:p-12">
            <p className="max-w-2xl font-display text-2xl leading-snug text-cream-dim md:text-3xl">
              The circle grows with every Volume. Be one of the names this story is built around.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-fog">
              Alumni spotlights and participant stories will live here as the series unfolds —
              the people who showed up, took the risk, and made the work.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
