"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function ServicesHero({
  eyebrow,
  headline,
  subheadline,
  image,
  imageAlt,
  videoUrl,
}: {
  eyebrow: string;
  headline: string;
  subheadline: string;
  image: string | null;
  imageAlt: string;
  videoUrl: string | null;
}) {
  return (
    <section className="relative flex min-h-[75vh] items-end overflow-hidden md:min-h-[90vh]">
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : image ? (
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          className="object-cover object-center scale-105 animate-[ken-burns_20s_ease-in-out_infinite_alternate]"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
      )}
      <div className="cinematic-overlay absolute inset-0 bg-ink/75" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full section-padding pb-16 pt-32 md:pb-24">
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="label-caps mb-4 text-accent"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="headline-xl max-w-4xl text-balance"
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="body-lg mt-6 max-w-2xl text-fog"
          >
            {subheadline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Button variant="primary" href="/book" size="lg">
              Start Your Project
            </Button>
            <Button variant="secondary" href="/portfolio" size="lg">
              View Portfolio
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
