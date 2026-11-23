import Image from "next/image";
import type { SeasonalCampaign } from "@/lib/seasonal/schema";
import { SeasonalCtaLink } from "./SeasonalCtaLink";
import { seasonStyle } from "./style";

/** The campaign's service trio. Asset-independent: cards without images use a typographic plate. */
export function SeasonalExperience({
  campaign,
  placement,
  headingLevel = "h2",
}: {
  campaign: SeasonalCampaign;
  placement: "home" | "landing";
  headingLevel?: "h2" | "h1";
}) {
  const cards = campaign.experience.cards.filter((c) => c.enabled);
  if (cards.length === 0) return null;
  const Heading = headingLevel;
  const anchor = `${campaign.slug}-edition`;

  return (
    <section
      id={anchor}
      data-season={campaign.id}
      style={seasonStyle(campaign)}
      aria-labelledby={`${anchor}-title`}
      className="relative scroll-mt-24 bg-[var(--season-onyx)] text-[var(--season-cream)]"
    >
      <div className="section-padding">
        <div className="container-wide">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="flex items-center gap-4 text-[0.62rem] tracking-[0.34em] text-[var(--season-gold)] uppercase md:text-[0.7rem]">
                <span className="season-rule h-px w-10" aria-hidden />
                {campaign.experience.eyebrow}
              </p>
              <Heading
                id={`${anchor}-title`}
                className="mt-6 font-display leading-[1.02]"
                style={{ fontSize: "clamp(2.25rem, 5.2vw, 4.5rem)" }}
              >
                {campaign.experience.heading}
              </Heading>
            </div>
            {campaign.experience.intro ? (
              <p className="text-base leading-relaxed text-[color-mix(in_srgb,var(--season-cream)_75%,transparent)] italic md:col-span-4 md:col-start-9 md:text-lg">
                {campaign.experience.intro}
              </p>
            ) : null}
          </div>

          <ol className="mt-14 grid gap-px bg-[color-mix(in_srgb,var(--season-cream)_12%,transparent)] md:mt-20 md:grid-cols-3">
            {cards.map((card, index) => (
              <li key={card.id} className="season-card group flex flex-col bg-[var(--season-onyx)]">
                <div
                  className={
                    "season-card-media relative overflow-hidden bg-[var(--season-burgundy)] " +
                    // Photographs get a portrait crop; typographic plates stay compact.
                    (card.image ? "aspect-[4/5]" : "aspect-[3/2]")
                  }
                >
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.imageAlt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover saturate-[0.8]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8" aria-hidden>
                      <span className="font-display text-[0.8rem] tracking-[0.3em] text-[color-mix(in_srgb,var(--season-cream)_70%,transparent)]">
                        ÉLEVÉ
                      </span>
                      <span
                        className="font-display leading-none text-[color-mix(in_srgb,var(--season-gold)_90%,transparent)]"
                        style={{ fontSize: "clamp(4rem, 9vw, 6.5rem)" }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="season-rule h-px w-full opacity-60" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6 md:p-8">
                  {card.eyebrow ? (
                    <p className="text-[0.6rem] tracking-[0.28em] text-[var(--season-gold)] uppercase">{card.eyebrow}</p>
                  ) : null}
                  <h3 className="mt-3 font-display text-3xl leading-tight md:text-[2.1rem]">{card.title}</h3>
                  <p className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-[color-mix(in_srgb,var(--season-cream)_78%,transparent)]">
                    {card.description}
                  </p>
                  {card.note ? (
                    <p className="mt-4 text-xs text-[color-mix(in_srgb,var(--season-cream)_60%,transparent)]">{card.note}</p>
                  ) : null}
                  <SeasonalCtaLink
                    href={card.cta.href}
                    campaign={campaign.trackingId}
                    service={card.id}
                    label={placement === "home" ? "seasonal_service_select" : "seasonal_landing_service_select"}
                    className="mt-8 inline-flex min-h-12 items-center justify-between gap-4 border-t border-[color-mix(in_srgb,var(--season-cream)_18%,transparent)] pt-5 text-[0.66rem] font-medium tracking-[0.24em] uppercase transition-colors duration-500 hover:text-[var(--season-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]"
                  >
                    <span>{card.cta.label}</span>
                    <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </SeasonalCtaLink>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
