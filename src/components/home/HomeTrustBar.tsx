"use client";

import Link from "next/link";
import type { HomepageTrustBarContent, TestimonialDTO } from "@/lib/types";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeTrustBar({
  testimonials,
  content,
  responseTime,
}: {
  testimonials: TestimonialDTO[];
  content: HomepageTrustBarContent;
  responseTime?: string;
}) {
  if (!content.enabled) return null;

  const pinned = content.featuredTestimonialIds?.length
    ? content.featuredTestimonialIds
        .map((id) => testimonials.find((t) => t.id === id))
        .filter((t): t is TestimonialDTO => Boolean(t))
    : [];
  const featured = (pinned.length ? pinned : testimonials)[0];
  const reply = responseTime?.trim() || "Within 24–48 hours on business days";
  const eyebrow = content.eyebrow === "Trusted experience" ? "ÉLEVÉ standard" : content.eyebrow;
  const headline =
    content.headline === "Confidence before the first frame."
      ? "One creative lead. One cinematic standard."
      : content.headline;
  const stats = content.stats?.length
    ? content.stats
    : [
        { label: "Typical reply", value: reply },
        { label: "Inquiry-first", value: "No public checkout" },
        { label: "Production", value: "Northern California" },
      ];

  return (
    <section
      className="border-b border-ink/15 bg-cream text-ink"
      aria-label="Trust and social proof"
      data-experiment-slot="trust_bar"
    >
      <div className="container-wide px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-ink/55">
              {eyebrow}
            </p>
            <h2 className="mt-3 max-w-lg font-display text-2xl leading-tight text-ink md:text-3xl">
              {headline}
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href={content.primaryCtaHref || "/book"}
                onClick={() =>
                  trackEngagement({ event: "cta_click", path: "/", label: "trust_bar_book" })
                }
                className="link-underline inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-ink uppercase"
              >
                {content.primaryCtaLabel === "Book Your Experience"
                  ? "Start a Project"
                  : content.primaryCtaLabel || "Start a Project"} →
              </Link>
              <Link
                href={content.secondaryCtaHref || "/portfolio"}
                onClick={() =>
                  trackEngagement({ event: "cta_click", path: "/", label: "trust_bar_portfolio" })
                }
                className="inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-ink/55 uppercase hover:text-ink"
              >
                {content.secondaryCtaLabel === "Explore Portfolio"
                  ? "View the Work"
                  : content.secondaryCtaLabel || "View the Work"}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 lg:border-l lg:border-ink/15 lg:pl-10">
            {featured ? (
              <blockquote>
                <p className="max-w-3xl font-display text-xl leading-snug text-ink md:text-2xl">
                  &ldquo;{featured.quote}&rdquo;
                </p>
                <footer className="mt-5">
                  <cite className="not-italic text-[0.65rem] tracking-[0.18em] text-ink/55 uppercase">
                    {featured.name}
                    {featured.role ? ` · ${featured.role}` : ""}
                  </cite>
                </footer>
              </blockquote>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-ink/65">
                Concept, light, movement, and finish are directed as one visual system.
              </p>
            )}
          </div>
        </div>

        <ul className="mt-8 grid border-t border-ink/15 pt-5 sm:grid-cols-3">
          {stats.slice(0, 3).map((stat) => (
            <li
              key={stat.label}
              className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3 sm:block sm:border-b-0 sm:border-r sm:border-ink/15 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:border-r-0"
            >
              <span className="text-[0.62rem] tracking-[0.18em] text-ink/45 uppercase">
                {stat.label}
              </span>
              <span className="text-sm text-ink/75 sm:mt-2 sm:block">{stat.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
