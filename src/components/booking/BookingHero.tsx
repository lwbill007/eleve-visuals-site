"use client";

import { motion } from "framer-motion";

export function BookingHero({
  headline,
  subheadline,
  notes,
}: {
  headline: string;
  subheadline: string;
  notes: string[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-stone/30">
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-ink to-ink-soft" />
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,168,138,0.06)_0%,transparent_55%)]" />

      <div className="relative z-10 section-padding pb-12 pt-32 md:pb-16">
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="label-caps mb-4 text-accent"
          >
            Project Inquiry
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="headline-xl max-w-4xl text-balance"
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="body-lg mt-6 max-w-2xl text-fog"
          >
            {subheadline}
          </motion.p>
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8"
          >
            {notes.map((note) => (
              <li key={note} className="flex items-center gap-2 text-sm text-cream-dim">
                <span className="h-1 w-1 rounded-full bg-accent" />
                {note}
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
