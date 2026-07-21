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
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="grid gap-14 border-t border-stone/50 pt-6 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <p className="label-caps mb-4 text-accent">{copy.eyebrow || brandStory.eyebrow}</p>
            <h2 className="max-w-3xl font-display text-[clamp(2.8rem,5vw,5.75rem)] leading-[0.94] tracking-[-0.035em] text-balance">
              {copy.headline || brandStory.headline}
            </h2>
            {copy.subheadline ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream-dim">
                {copy.subheadline}
              </p>
            ) : null}
            <div className="mt-8 max-w-2xl space-y-5">
              {brandStory.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-fog md:text-base">
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-12">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group border-b border-stone/50 py-6 first:border-t"
              >
                <p className="font-display text-2xl text-cream transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-accent">
                  {pillar.title}
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-fog">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
