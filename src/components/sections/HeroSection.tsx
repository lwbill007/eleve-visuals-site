"use client";

import { Button } from "@/components/ui/Button";
import { MediaImage } from "@/components/ui/MediaImage";
import type { HeroContent, SiteConfig } from "@/lib/types";

interface HeroSectionProps {
  hero: HeroContent;
  siteConfig: SiteConfig;
}

export function HeroSection({ hero, siteConfig }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-screen items-center">
      <MediaImage
        src={hero.image}
        alt={hero.imageAlt || siteConfig.name}
        className="absolute inset-0"
        overlay
        priority
      />

      <div className="grain relative z-10 w-full section-padding py-32 md:py-40">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="label-caps mb-5 text-accent">{siteConfig.location}</p>

            <h1 className="headline-xl text-balance">{siteConfig.name}</h1>

            <p className="mt-5 font-display text-2xl leading-snug text-cream md:text-3xl text-balance">
              {siteConfig.tagline}
            </p>

            <p className="mt-4 text-sm tracking-wide text-fog">
              By {siteConfig.creator} · {siteConfig.serviceArea}
            </p>

            <p className="body-lg mt-6 max-w-xl">{hero.subheadline}</p>

            <div className="mt-10 flex flex-col items-start gap-4">
              <Button
                variant="primary"
                size="lg"
                href={hero.primaryCta.href}
                className="min-w-[240px] px-12 py-5 text-sm tracking-[0.2em]"
              >
                Book a Shoot
              </Button>
              <Button variant="ghost" size="sm" href={hero.secondaryCta.href}>
                {hero.secondaryCta.label} →
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 md:block">
        <div className="flex flex-col items-center gap-2">
          <span className="label-caps text-[0.55rem] text-muted">Scroll</span>
          <div className="h-10 w-px bg-gradient-to-b from-fog/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
