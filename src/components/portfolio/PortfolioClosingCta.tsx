"use client";

import { Button } from "@/components/ui/Button";
import { trackEngagement } from "@/lib/analytics-client";

export function PortfolioClosingCta({
  headline,
  subheadline,
  primaryLabel,
  primaryHref,
}: {
  headline: string;
  subheadline?: string;
  primaryLabel: string;
  primaryHref: string;
}) {
  return (
    <section className="flex min-h-[58dvh] items-end bg-ink-soft section-padding">
      <div className="container-wide">
        <div className="max-w-5xl border-t border-stone/60 pt-6">
          <p className="label-caps mb-5 text-accent">Commission ÉLEVÉ</p>
          <h2 className="max-w-5xl font-display text-[clamp(3.2rem,7vw,7.5rem)] leading-[0.9] tracking-[-0.045em] text-balance">
            {headline}
          </h2>
          {subheadline ? (
            <p className="mt-7 max-w-xl text-base leading-relaxed text-fog md:text-lg">
              {subheadline}
            </p>
          ) : null}
          <div className="mt-10">
            <Button
              variant="primary"
              size="lg"
              href={primaryHref}
              onClick={() =>
                trackEngagement({
                  event: "cta_click",
                  path: "/portfolio",
                  label: "portfolio_closing_primary",
                })
              }
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
