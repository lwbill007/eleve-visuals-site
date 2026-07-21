"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { HeroContent } from "@/lib/types";
import { trackEngagement, trackFunnel } from "@/lib/analytics-client";

export function HomeHero({
  hero,
  experimentId,
}: {
  hero: HeroContent;
  experimentId?: string | null;
}) {
  const primaryLabel = hero.primaryCta.label || "Book Your Experience";
  const secondaryLabel = hero.secondaryCta.label || "Explore Portfolio";

  return (
    <section
      className="relative min-h-[100dvh] overflow-hidden bg-ink"
      aria-label="Hero"
      data-experiment-slot="hero"
      data-experiment-id={experimentId || undefined}
    >
      <div className="absolute inset-x-0 top-0 h-[64dvh] overflow-hidden lg:inset-y-0 lg:left-[42%] lg:h-auto">
        {hero.videoUrl ? (
          <video
            src={hero.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero.image || undefined}
            className="h-full w-full object-cover"
            aria-hidden
          />
        ) : hero.image ? (
          <Image
            src={hero.image}
            alt={hero.imageAlt || "ÉLEVÉ Visuals"}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
        )}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,10,0.05)_0%,rgba(10,10,10,0.12)_42%,#0a0a0a_67%,#0a0a0a_100%)] lg:bg-[linear-gradient(90deg,#0a0a0a_0%,#0a0a0a_34%,rgba(10,10,10,0.92)_47%,rgba(10,10,10,0.12)_74%,rgba(10,10,10,0.28)_100%)]" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 flex min-h-[100dvh] w-full items-end px-5 pb-12 pt-[54dvh] sm:px-8 sm:pb-16 lg:items-center lg:px-12 lg:py-32">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-2xl lg:w-[52%] lg:max-w-none lg:pr-10">
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-10 bg-accent/70" aria-hidden />
              <p className="label-caps text-accent">ÉLEVÉ Visuals · Editorial production</p>
            </div>
            <h1 className="font-display text-[clamp(3.25rem,7.3vw,7.6rem)] leading-[0.88] tracking-[-0.045em] text-balance text-cream">
              {hero.headline}
            </h1>
            <div className="mt-7 max-w-xl border-l border-accent/40 pl-5 sm:mt-9 sm:pl-6">
              <p className="text-base leading-relaxed text-cream-dim sm:text-lg">
                {hero.subheadline}
              </p>
              {hero.description ? (
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-fog">
                  {hero.description}
                </p>
              ) : null}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
            <Button
              variant="primary"
              size="lg"
              href={hero.primaryCta.href || "/book"}
              className="group justify-between gap-8 sm:justify-center"
              onClick={() => {
                trackEngagement({ event: "cta_click", path: "/", label: "hero_primary" });
                trackFunnel("hero_cta_clicked", { metadata: { cta: "primary" } });
              }}
            >
              <span>{primaryLabel}</span>
              <span
                className="text-base transition-transform duration-500 group-hover:translate-x-1"
                aria-hidden
              >
                ↗
              </span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href={hero.secondaryCta.href || "/portfolio"}
              className="justify-center"
              onClick={() => {
                trackEngagement({ event: "cta_click", path: "/", label: "hero_secondary" });
                trackFunnel("hero_cta_clicked", { metadata: { cta: "secondary" } });
              }}
            >
              {secondaryLabel}
            </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-10 right-10 z-10 hidden items-center gap-4 lg:flex"
        aria-hidden
      >
        <span className="label-caps text-[0.55rem] text-cream/70">Selected work below</span>
        <span className="h-px w-14 bg-cream/35" />
      </div>
    </section>
  );
}
