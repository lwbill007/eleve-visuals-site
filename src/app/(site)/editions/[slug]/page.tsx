import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeaturedPortfolio } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { getCampaignForLanding, getPublicSeasonalState } from "@/lib/seasonal/server";
import { landingPath } from "@/lib/seasonal/links";
import { SeasonalHero } from "@/components/seasonal/SeasonalHero";
import { SeasonalExperience } from "@/components/seasonal/SeasonalExperience";
import { SeasonalCtaLink } from "@/components/seasonal/SeasonalCtaLink";
import { SeasonalLandingView } from "@/components/seasonal/SeasonalLandingView";
import { seasonStyle } from "@/components/seasonal/style";

// Same freshness as the homepage; a campaign that ends returns 404 within ~60 s.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignForLanding(slug);
  if (!campaign) return { title: "Not found", robots: { index: false, follow: false } };
  const state = await getPublicSeasonalState();
  const base = await buildPageMetadata({
    title: `${campaign.name} — ${campaign.headline.replace(/\.$/, "")}`,
    description: [campaign.description, campaign.secondaryLine].filter(Boolean).join(" "),
    path: landingPath(campaign),
    image: campaign.heroImageDesktop,
  });
  return state.preview ? { ...base, robots: { index: false, follow: false } } : base;
}

export default async function EditionPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await getCampaignForLanding(slug);
  if (!campaign) notFound();

  // Authentic evidence only: existing published, featured ÉLEVÉ portfolio work.
  const work = (await getFeaturedPortfolio()).filter((item) => item.image).slice(0, 3);

  return (
    <>
      <SeasonalLandingView campaign={campaign.trackingId} />
      <SeasonalHero campaign={{ ...campaign, primaryCta: { ...campaign.primaryCta, href: `#${campaign.slug}-edition` } }} placement="landing" />
      <SeasonalExperience campaign={campaign} placement="landing" />

      {work.length ? (
        <section
          data-season={campaign.id}
          style={seasonStyle(campaign)}
          aria-labelledby="edition-work-title"
          className="bg-[var(--season-onyx)] text-[var(--season-cream)]"
        >
          <div className="section-padding border-t border-[color-mix(in_srgb,var(--season-cream)_10%,transparent)]">
            <div className="container-wide">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <h2 id="edition-work-title" className="font-display leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}>
                  Recent work
                </h2>
                <Link
                  href="/portfolio"
                  className="text-[0.66rem] tracking-[0.24em] uppercase underline-offset-8 hover:text-[var(--season-gold)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]"
                >
                  View the full portfolio →
                </Link>
              </div>
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {work.map((item) => (
                  <li key={item.id}>
                    <Link href={`/portfolio/${item.slug}`} className="season-card group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]">
                      <div className="season-card-media relative aspect-[4/5] overflow-hidden bg-[var(--season-burgundy)]">
                        <Image
                          src={item.image!}
                          alt={item.imageAlt || item.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover saturate-[0.8]"
                        />
                      </div>
                      <p className="mt-4 font-display text-xl">{item.title}</p>
                      {item.subtitle ? (
                        <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--season-cream)_65%,transparent)]">{item.subtitle}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section
        data-season={campaign.id}
        style={seasonStyle(campaign)}
        aria-labelledby="edition-close-title"
        className="grain relative overflow-hidden bg-[var(--season-burgundy)] text-[var(--season-cream)]"
      >
        <div className="section-padding">
          <div className="container-narrow text-center">
            <p className="text-[0.62rem] tracking-[0.34em] text-[var(--season-gold)] uppercase">{campaign.subtitle || campaign.name}</p>
            <h2 id="edition-close-title" className="mt-6 font-display leading-[1.05]" style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}>
              {campaign.secondaryLine || campaign.headline}
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              {campaign.experience.cards
                .filter((c) => c.enabled)
                .map((c) => (
                  <SeasonalCtaLink
                    key={c.id}
                    href={c.cta.href}
                    campaign={campaign.trackingId}
                    service={c.id}
                    label="seasonal_landing_close_cta"
                    className="inline-flex min-h-12 items-center justify-center border border-[color-mix(in_srgb,var(--season-cream)_45%,transparent)] px-6 text-[0.64rem] font-medium tracking-[0.22em] uppercase transition-colors duration-500 hover:border-[var(--season-gold)] hover:bg-[var(--season-gold)] hover:text-[var(--season-onyx)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]"
                  >
                    {c.cta.label}
                  </SeasonalCtaLink>
                ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
