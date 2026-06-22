"use client";

import { motion } from "framer-motion";
import type { HomepageProcessStep, HomepageSectionCopy } from "@/lib/types";

export function HomeProcessTimeline({
  copy,
  steps,
}: {
  copy: HomepageSectionCopy;
  steps: HomepageProcessStep[];
}) {
  if (steps.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30 overflow-hidden">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-2xl md:mb-16"
        >
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg">{copy.headline}</h2>
          {copy.subheadline && <p className="body-lg mt-4 text-fog">{copy.subheadline}</p>}
        </motion.div>

        <div className="relative">
          <div className="absolute top-8 right-0 left-0 hidden h-px bg-stone/30 md:block" />
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:pb-0">
            {steps.map((step, index) => (
              <motion.div
                key={`${step.step}-${step.title}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, delay: index * 0.07 }}
                className="min-w-[220px] shrink-0 border border-stone/30 bg-ink-soft p-6 md:min-w-0"
              >
                <p className="font-display text-3xl text-accent/80">{step.step}</p>
                <h3 className="mt-4 font-display text-lg text-cream">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
