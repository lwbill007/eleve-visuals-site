"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HomepageTrustBarContent, TestimonialDTO } from "@/lib/types";
import { trackEngagement, trackFunnel } from "@/lib/analytics-client";

export function HomeTrustBar({
  testimonials,
  content,
}: {
  testimonials: TestimonialDTO[];
  content: HomepageTrustBarContent;
}) {
  if (!content.enabled) return null;

  const pinned = content.featuredTestimonialIds?.length
    ? content.featuredTestimonialIds
        .map((id) => testimonials.find((t) => t.id === id))
        .filter((t): t is TestimonialDTO => Boolean(t))
    : [];
  const preview = (pinned.length ? pinned : testimonials).slice(0, 3);
  const stats = content.stats?.length
    ? content.stats
    : [
        { label: "Typical reply", value: "1–2 days" },
        { label: "Inquiry-first", value: "No deposit online" },
        { label: "Production", value: "Northern California" },
      ];

  return (
    <section
      className="border-b border-stone/30 bg-ink-soft/80"
      aria-label="Trust and social proof"
      data-experiment-slot="trust_bar"
    >
      <div className="container-wide section-padding !py-10 md:!py-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-4">
            <p className="label-caps text-accent">{content.eyebrow}</p>
            <p className="mt-3 font-display text-2xl text-cream md:text-3xl">{content.headline}</p>
            <ul className="mt-6 space-y-3">
              {stats.map((s) => (
                <li
                  key={s.label}
                  className="flex items-baseline justify-between gap-4 border-b border-stone/20 pb-2"
                >
                  <span className="text-xs tracking-[0.14em] text-muted uppercase">{s.label}</span>
                  <span className="text-sm text-cream-dim">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
            {preview.length > 0 ? (
              preview.map((t, i) => (
                <motion.blockquote
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="border border-stone/25 bg-charcoal/20 p-5"
                >
                  <p className="line-clamp-4 text-sm leading-relaxed text-cream-dim">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-4">
                    <cite className="not-italic text-xs tracking-wide text-muted uppercase">
                      {t.name}
                      {t.role ? ` · ${t.role}` : ""}
                    </cite>
                  </footer>
                </motion.blockquote>
              ))
            ) : (
              <p className="text-sm text-fog sm:col-span-3">
                Selective collaborations with brands, athletes, and artists who expect editorial
                craft.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={content.primaryCtaHref || "/book"}
            onClick={() => {
              trackEngagement({ event: "cta_click", path: "/", label: "trust_bar_book" });
              trackFunnel("hero_cta_clicked", {
                metadata: { source: "trust_bar_primary" },
              });
            }}
            className="inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-accent uppercase link-underline"
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
    </section>
  );
}
