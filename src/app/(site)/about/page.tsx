import type { Metadata } from "next";
import Image from "next/image";
import { PageHero, CTABanner } from "@/components/ui/Section";
import { getAboutContent, getPageCopy } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Bill — the visual director behind ÉLEVÉ Visuals. Photography, film, and creative direction in Sacramento and the Bay Area.",
};

export default async function AboutPage() {
  const [aboutContent, pageCopy] = await Promise.all([getAboutContent(), getPageCopy()]);

  return (
    <>
      <PageHero
        eyebrow="About"
        headline={aboutContent.headline}
        subheadline={aboutContent.intro}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="relative aspect-[3/4] overflow-hidden bg-charcoal lg:col-span-5">
              {aboutContent.image ? (
                <Image
                  src={aboutContent.image}
                  alt={aboutContent.imageAlt || aboutContent.headline}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
              )}
            </div>
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="space-y-5">
                {aboutContent.story.map((p, i) => (
                  <p key={i} className="body-lg">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-stone/30 bg-ink-soft">
        <div className="container-wide">
          <h2 className="headline-md mb-12">{aboutContent.philosophy.headline}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {aboutContent.philosophy.pillars.map((pillar) => (
              <div key={pillar.title} className="border-t border-accent/40 pt-6">
                <h3 className="font-display text-2xl mb-3">{pillar.title}</h3>
                <p className="text-sm leading-relaxed text-fog">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <h2 className="headline-md mb-12">{aboutContent.process.headline}</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {aboutContent.process.steps.map((step) => (
              <div key={step.step}>
                <p className="font-display text-4xl text-stone mb-4">{step.step}</p>
                <h3 className="font-display text-xl mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fog">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding border-t border-stone/30 bg-ink-soft">
        <div className="container-wide grid gap-12 lg:grid-cols-2">
          <h2 className="headline-md">{aboutContent.trust.headline}</h2>
          <ul className="space-y-4">
            {aboutContent.trust.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-fog">
                <span className="text-accent">—</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTABanner
        headline={pageCopy.aboutCta.headline}
        primaryLabel={pageCopy.aboutCta.primaryLabel}
        primaryHref={pageCopy.aboutCta.primaryHref}
        secondaryLabel={pageCopy.aboutCta.secondaryLabel}
        secondaryHref={pageCopy.aboutCta.secondaryHref}
      />
    </>
  );
}
