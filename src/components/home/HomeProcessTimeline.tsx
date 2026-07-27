"use client";

import Link from "next/link";
import type { HomepageProcessStep, HomepageSectionCopy } from "@/lib/types";

export function HomeProcessTimeline({
  copy,
  steps,
  moreHref,
  moreLabel,
}: {
  copy: HomepageSectionCopy;
  steps: HomepageProcessStep[];
  moreHref?: string;
  moreLabel?: string;
}) {
  if (steps.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30 overflow-hidden">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl md:mb-16">
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg">{copy.headline}</h2>
          {copy.subheadline && <p className="body-lg mt-4 text-fog">{copy.subheadline}</p>}
        </div>

        <div className="relative">
          <div className="absolute top-8 right-0 left-0 hidden h-px bg-stone/30 md:block" />
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:pb-0">
            {steps.map((step) => (
              <div
                key={`${step.step}-${step.title}`}
                className="w-[78%] shrink-0 snap-start border border-stone/30 bg-ink-soft p-6 xs:w-[60%] sm:w-[44%] md:w-auto md:min-w-0"
              >
                <p className="font-display text-3xl text-accent/80">{step.step}</p>
                <h3 className="mt-4 font-display text-lg text-cream">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {moreHref && (
          <Link
            href={moreHref}
            className="mt-8 inline-block text-xs tracking-[0.2em] text-accent uppercase link-underline"
          >
            {moreLabel || "See the full experience →"}
          </Link>
        )}
      </div>
    </section>
  );
}
