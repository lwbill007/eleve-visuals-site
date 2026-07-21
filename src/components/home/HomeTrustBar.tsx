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
  const reply = responseTime?.trim() || "1–2 business days";
  const stats = content.stats?.length
    ? content.stats
    : [
        { label: "Typical reply", value: reply },
        { label: "Inquiry-first", value: "No deposit online" },
        { label: "Production", value: "Northern California" },
      ];

  return (
    <section
      className="border-b border-stone/30 bg-ink-soft"
      aria-label="Trust and social proof"
      data-experiment-slot="trust_bar"
    >
      <div className="container-wide section-padding !py-12 md:!py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <p className="label-caps text-accent">{content.eyebrow}</p>
            <h2 className="mt-4 max-w-md font-display text-3xl leading-[1.02] text-cream md:text-4xl">
              {content.headline}
            </h2>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href={content.primaryCtaHref || "/book"}
                onClick={() =>
                  trackEngagement({ event: "cta_click", path: "/", label: "trust_bar_book" })
                }
                className="link-underline inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-accent uppercase"
              >
                {content.primaryCtaLabel || "Book Your Experience"} →
              </Link>
              <Link
                href={content.secondaryCtaHref || "/portfolio"}
                onClick={() =>
                  trackEngagement({ event: "cta_click", path: "/", label: "trust_bar_portfolio" })
                }
                className="inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-fog uppercase hover:text-cream"
              >
                {content.secondaryCtaLabel || "Explore Portfolio"}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            {featured ? (
              <blockquote className="border-l border-stone/70 pl-6 md:pl-9">
                <p className="max-w-3xl font-display text-2xl leading-snug text-cream-dim md:text-3xl">
                  &ldquo;{featured.quote}&rdquo;
                </p>
                <footer className="mt-5">
                  <cite className="not-italic text-[0.65rem] tracking-[0.18em] text-muted uppercase">
                    {featured.name}
                    {featured.role ? ` · ${featured.role}` : ""}
                  </cite>
                </footer>
              </blockquote>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-fog">
                Selective collaborations with brands, athletes, and artists who expect editorial
                craft.
              </p>
            )}
          </div>
        </div>

        <ul className="mt-10 grid border-t border-stone/40 pt-6 sm:grid-cols-3 lg:mt-12">
          {stats.slice(0, 3).map((stat) => (
            <li
              key={stat.label}
              className="flex items-baseline justify-between gap-4 border-b border-stone/30 py-4 sm:block sm:border-b-0 sm:border-r sm:px-6 sm:py-0 sm:first:pl-0 sm:last:border-r-0"
            >
              <span className="text-[0.62rem] tracking-[0.18em] text-muted uppercase">
                {stat.label}
              </span>
              <span className="text-sm text-cream-dim sm:mt-2 sm:block">{stat.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
