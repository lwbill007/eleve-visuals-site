"use client";

import { motion } from "framer-motion";
import type { ServicesProcessStep } from "@/lib/types";

export function ServicesProcess({
  eyebrow,
  headline,
  subheadline,
  steps,
}: {
  eyebrow: string;
  headline: string;
  subheadline: string;
  steps: ServicesProcessStep[];
}) {
  return (
    <section className="section-padding border-y border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-16 max-w-2xl">
          <p className="label-caps mb-4 text-accent">{eyebrow}</p>
          <h2 className="headline-md">{headline}</h2>
          <p className="body-lg mt-4 text-fog">{subheadline}</p>
        </div>

        <div className="grid gap-px bg-stone/30 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: index * 0.06 }}
              className="group bg-ink-soft p-8 transition-colors duration-500 hover:bg-charcoal/40 md:p-10"
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="font-display text-4xl text-stone transition-colors group-hover:text-accent">
                  {step.step}
                </span>
                <span className="h-px flex-1 bg-stone/40" />
              </div>
              <h3 className="font-display text-2xl text-cream">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fog">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
