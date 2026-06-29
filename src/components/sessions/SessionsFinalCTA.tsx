"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { resolveSessionPosterImage } from "@/lib/session-volume";
import { Button } from "@/components/ui/Button";

export function SessionsFinalCTA({
  volume,
  canApply,
  fallbackLabel,
  fallbackHref,
}: {
  volume: SessionVolumeDTO | null;
  canApply: boolean;
  fallbackLabel: string;
  fallbackHref: string;
}) {
  const backdrop = volume ? volume.bannerImage || resolveSessionPosterImage(volume) : null;
  const showApply = !!(volume && canApply);

  return (
    <section className="relative overflow-hidden">
      {backdrop && (
        <div aria-hidden className="absolute inset-0">
          <Image src={backdrop} alt="" fill className="object-cover object-center opacity-40" sizes="100vw" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
      <div className="grain absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,168,138,0.12),transparent_60%)]" />

      <div className="relative section-padding py-28 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="container-narrow text-center"
        >
          <p className="label-caps mb-6 text-accent">The Invitation</p>
          <h2 className="font-display text-4xl leading-[1.05] text-balance text-cream md:text-6xl">
            Every creative has a moment where everything changes.
            <span className="block text-accent">This could be yours.</span>
          </h2>
          <p className="body-lg mx-auto mt-7 max-w-xl">
            The cast is curated. The spots are limited. If you&rsquo;ve been waiting for a reason to
            create something that lasts — this is it.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {showApply ? (
              <>
                <Button variant="primary" size="lg" href={`/sessions/${volume!.slug}/apply`}>
                  Apply for Vol. {volume!.volumeNumber}
                </Button>
                <Button variant="ghost" size="lg" href={`/sessions/${volume!.slug}`}>
                  Explore the Volume
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" href={fallbackHref}>
                {fallbackLabel}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
