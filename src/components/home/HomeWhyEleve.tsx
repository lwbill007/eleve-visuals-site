"use client";

import type { BrandStory, HomepageSectionCopy, HomepageWhyPillar } from "@/lib/types";

export function HomeWhyEleve({
  brandStory,
  copy,
  pillars,
}: {
  brandStory: BrandStory;
  copy: HomepageSectionCopy;
  pillars: HomepageWhyPillar[];
}) {
  const headline =
    copy.headline === "Direction before execution. Always."
      ? "The image starts before the camera."
      : copy.headline || brandStory.headline;
  const subheadline =
    copy.subheadline === "We build visual identities — not just images."
      ? "Concept, light, movement, and finish — designed as one visual system."
      : copy.subheadline;

  return (
    <section className="section-padding border-b border-stone/30 bg-ink">
      <div className="container-wide">
        <div className="grid gap-14 border-t border-accent/60 pt-6 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6 lg:sticky lg:top-32 lg:self-start">
            <p className="label-caps mb-4 text-accent">The ÉLEVÉ Method</p>
            <h2 className="max-w-3xl font-display text-[clamp(3rem,5.4vw,6.25rem)] leading-[0.9] tracking-[-0.04em] text-balance">
              {headline}
            </h2>
            {subheadline ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream-dim">
                {subheadline}
              </p>
            ) : null}
            <div className="mt-8 max-w-xl border-l border-accent/40 pl-5">
              <p className="text-sm leading-relaxed text-fog md:text-base">
                {brandStory.body[0] ||
                  "Every project is directed from first idea to final frame so stills and motion belong to the same world."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 lg:pt-16">
            {pillars.slice(0, 4).map((pillar, index) => (
              <div
                key={pillar.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-stone/60 py-7 first:border-t"
              >
                <p className="font-display text-2xl italic text-accent">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-cream">
                    {pillar.title}
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-fog">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
            <p className="mt-10 border-b border-accent/60 pb-5 text-right font-display text-2xl italic text-cream-dim md:text-3xl">
              One creative lead. One cinematic standard.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
