"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { HeroContent } from "@/lib/types";
import { trackEngagement, trackFunnel } from "@/lib/analytics-client";
import { SERVICE_STARTING_PRICE_TEXT } from "@/lib/pricing-config";

export function HomeHero({
  hero,
  experimentId,
}: {
  hero: HeroContent;
  experimentId?: string | null;
}) {
  const primaryLabel = hero.primaryCta.label || "Book Your Experience";
  const secondaryLabel = hero.secondaryCta.label || "Explore Portfolio";
  const hasMedia = Boolean(hero.videoUrl || hero.image);

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden bg-ink"
      aria-label="Hero"
      data-experiment-slot="hero"
      data-experiment-id={experimentId || undefined}
    >
      <div
        className={
          hasMedia
            ? "absolute inset-x-0 top-0 h-[58svh] overflow-hidden lg:inset-y-0 lg:left-[43%] lg:h-auto"
            : "hidden"
        }
      >
        {hero.videoUrl ? (
          <video
            src={hero.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero.image || undefined}
            className="h-full w-full object-cover object-center saturate-[0.78]"
            aria-hidden
          />
        ) : hero.image ? (
          <Image
            src={hero.image}
            alt={hero.imageAlt || "ÉLEVÉ Visuals"}
            fill
            priority
            className="object-cover object-center saturate-[0.78]"
            sizes="100vw"
          />
        ) : null}
      </div>

      {hasMedia ? (
        <>
          <div className="absolute inset-x-0 top-[50svh] h-24 bg-ink lg:inset-y-0 lg:left-[43%] lg:top-0 lg:h-auto lg:w-24" />
          <div className="absolute inset-y-0 right-0 hidden w-[57%] bg-ink/15 lg:block" />
        </>
      ) : null}
      <div className="grain absolute inset-0" />

      <div
        className={
          hasMedia
            ? "relative z-10 flex min-h-[100svh] w-full items-end px-5 pb-10 pt-[54svh] sm:px-8 sm:pb-14 lg:items-center lg:px-12 lg:py-32"
            : "relative z-10 flex min-h-[100svh] w-full items-center px-5 py-28 sm:px-8 lg:px-12"
        }
      >
        <div className="mx-auto w-full max-w-7xl">
          <div
            className={
              hasMedia
                ? "max-w-2xl lg:w-[52%] lg:max-w-none lg:pr-12"
                : "max-w-3xl lg:w-[72%] lg:max-w-none"
            }
          >
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-10 bg-accent/70" aria-hidden />
              <p className="label-caps text-cream/75">Photography · Film · Creative Direction</p>
            </div>
            <h1 className="font-display text-[clamp(3.15rem,6.4vw,6.85rem)] leading-[0.9] tracking-[-0.045em] text-balance text-cream">
              {hero.headline}
            </h1>
            <div className="mt-6 max-w-xl border-l border-accent/50 pl-5 sm:mt-8 sm:pl-6">
              <p className="text-base leading-relaxed text-cream-dim sm:text-lg">
                {hero.subheadline}
              </p>
              {hero.description ? (
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-fog">
                  {hero.description}
                </p>
              ) : null}
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
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
            <Link
              href="/pricing"
              onClick={() =>
                trackEngagement({ event: "cta_click", path: "/", label: "hero_pricing" })
              }
              className="mt-5 block border-l border-accent/60 pl-4 text-sm leading-relaxed text-cream-dim transition-colors hover:text-cream sm:mt-6"
            >
              <span className="block font-medium text-cream">See packages and exact deliverables</span>
              <span className="mt-1 block text-fog">
                {SERVICE_STARTING_PRICE_TEXT.photography} · {SERVICE_STARTING_PRICE_TEXT.videography}
                {" · "}
                {SERVICE_STARTING_PRICE_TEXT["monthly-partnerships"]}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-10 left-12 z-10 hidden items-center gap-4 lg:flex"
        aria-hidden
      >
        <span className="label-caps text-[0.55rem] text-cream/60">Selected stories below</span>
        <span className="h-px w-14 bg-accent/60" />
      </div>
    </section>
  );
}
