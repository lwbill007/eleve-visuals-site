"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { HomepageCtaCopy } from "@/lib/types";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeFinalCta({ copy }: { copy: HomepageCtaCopy }) {
  return (
    <section
      className="relative flex min-h-[70dvh] items-end overflow-hidden"
      data-experiment-slot="final_cta"
    >
      {copy.videoUrl ? (
        <video
          src={copy.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={copy.backgroundImage || undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : copy.backgroundImage ? (
        <Image
          src={copy.backgroundImage}
          alt=""
          fill
          loading="lazy"
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.98)_0%,rgba(10,10,10,0.84)_48%,rgba(10,10,10,0.35)_100%)]" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full section-padding py-24 md:py-32">
        <div className="container-wide">
          <div className="max-w-4xl border-t border-cream/30 pt-6">
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="max-w-4xl font-display text-[clamp(3.2rem,7vw,7.5rem)] leading-[0.9] tracking-[-0.045em] text-balance">
            {copy.headline}
          </h2>
          {copy.subheadline && (
            <p className="mt-7 max-w-xl text-base leading-relaxed text-fog md:text-lg">
              {copy.subheadline}
            </p>
          )}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              variant="primary"
              size="lg"
              href={copy.primaryHref}
              onClick={() =>
                trackEngagement({ event: "cta_click", path: "/", label: "final_cta_primary" })
              }
            >
              {copy.primaryLabel}
            </Button>
            {copy.secondaryLabel && copy.secondaryHref && (
              <Button
                variant="secondary"
                size="lg"
                href={copy.secondaryHref}
                onClick={() =>
                  trackEngagement({
                    event: "cta_click",
                    path: "/",
                    label: "final_cta_secondary",
                  })
                }
              >
                {copy.secondaryLabel}
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
