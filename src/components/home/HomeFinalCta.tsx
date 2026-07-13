"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { HomepageCtaCopy } from "@/lib/types";
import { trackEngagement, trackFunnel } from "@/lib/analytics-client";

export function HomeFinalCta({ copy }: { copy: HomepageCtaCopy }) {
  return (
    <section className="relative overflow-hidden" data-experiment-slot="final_cta">
      {copy.videoUrl ? (
        <video
          src={copy.videoUrl}
          autoPlay
          muted
          loop
          playsInline
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
      <div className="cinematic-overlay absolute inset-0 bg-ink/85" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 section-padding py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="container-wide text-center"
        >
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg mx-auto max-w-3xl text-balance">{copy.headline}</h2>
          {copy.subheadline && (
            <p className="body-lg mx-auto mt-6 max-w-xl text-fog">{copy.subheadline}</p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              href={copy.primaryHref}
              onClick={() => {
                trackEngagement({ event: "cta_click", path: "/", label: "final_cta_primary" });
                trackFunnel("hero_cta_clicked", { metadata: { source: "final_cta" } });
              }}
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
        </motion.div>
      </div>
    </section>
  );
}
