"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { PortfolioPageContent } from "@/lib/types";

export function PortfolioStats({ stats }: { stats: PortfolioPageContent["stats"] }) {
  if (!stats.length) return null;

  return (
    <section className="border-b border-stone/30 bg-ink-soft">
      <div className="container-wide section-padding py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="font-display text-3xl text-cream md:text-4xl">{stat.value}</p>
              <p className="label-caps mt-2 text-[0.55rem] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PortfolioEmptyState({
  emptyState,
}: {
  emptyState: PortfolioPageContent["emptyState"];
}) {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-2xl text-cream md:text-3xl">{emptyState.headline}</p>
      <p className="body-lg mx-auto mt-4 max-w-lg text-fog">{emptyState.subheadline}</p>
      {emptyState.ctaLabel && emptyState.ctaHref && (
        <div className="mt-8">
          <Button variant="primary" href={emptyState.ctaHref}>
            {emptyState.ctaLabel}
          </Button>
        </div>
      )}
      <Link
        href="/portfolio"
        className="label-caps link-underline mt-6 inline-block text-accent hover:text-cream"
      >
        View all work →
      </Link>
    </div>
  );
}
