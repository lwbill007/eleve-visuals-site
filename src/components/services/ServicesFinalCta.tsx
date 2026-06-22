"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function ServicesFinalCta({
  headline,
  subheadline,
  primaryLabel,
  primaryHref,
}: {
  headline: string;
  subheadline: string;
  primaryLabel: string;
  primaryHref: string;
}) {
  return (
    <section className="relative overflow-hidden section-padding">
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,168,138,0.08)_0%,transparent_70%)]" />

      <div className="container-narrow relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="label-caps mb-6 text-accent"
        >
          Start Your Project
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="headline-lg text-balance"
        >
          {headline}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="body-lg mx-auto mt-6 max-w-xl text-fog"
        >
          {subheadline}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-10"
        >
          <Button variant="primary" href={primaryHref} size="lg">
            {primaryLabel}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
