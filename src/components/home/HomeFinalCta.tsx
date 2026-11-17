"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { HomepageCtaCopy } from "@/lib/types";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeFinalCta({ copy }: { copy: HomepageCtaCopy }) {
  const headline =
    copy.headline === "Ready to create something unforgettable?"
      ? "Have a release, fight, drop, or story worth building around?"
      : copy.headline;
  const subheadline =
    copy.subheadline === "Limited availability. Exceptional projects only."
      ? "Tell us what is moving, when it launches, and what the work needs to make people feel."
      : copy.subheadline;

  return (
    <section
      className="relative flex min-h-[58svh] items-center overflow-hidden bg-ink"
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
        <div className="absolute inset-0 bg-ink" />
      )}
      {(copy.videoUrl || copy.backgroundImage) && <div className="absolute inset-0 bg-ink/65" />}
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full section-padding py-20 md:py-28">
        <div className="container-wide">
          <div className="mx-auto max-w-6xl border-y border-accent/60 py-10 text-center md:py-14">
          {copy.eyebrow && <p className="label-caps mb-5 text-accent">{copy.eyebrow}</p>}
          <h2 className="mx-auto max-w-5xl font-display text-[clamp(3rem,6vw,6.5rem)] leading-[0.9] tracking-[-0.045em] text-balance">
            {headline}
          </h2>
          {subheadline && (
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-fog md:text-lg">
              {subheadline}
            </p>
          )}
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button
              variant="primary"
              size="lg"
              href={copy.primaryHref}
              onClick={() =>
                trackEngagement({ event: "cta_click", path: "/", label: "final_cta_primary" })
              }
            >
              {copy.primaryLabel === "Book Your Experience" ? "Start a Project" : copy.primaryLabel}
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
          <p className="mt-9 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-cream/55">
            Sacramento ↔ Bay Area · Reply within 1–2 business days
          </p>
          </div>
        </div>
      </div>
    </section>
  );
}
