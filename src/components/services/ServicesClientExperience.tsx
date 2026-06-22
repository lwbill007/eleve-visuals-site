"use client";

import { motion } from "framer-motion";
import type { ServicesClientStep } from "@/lib/types";

export function ServicesClientExperience({
  eyebrow,
  headline,
  subheadline,
  steps,
}: {
  eyebrow: string;
  headline: string;
  subheadline: string;
  steps: ServicesClientStep[];
}) {
  return (
    <section className="section-padding border-t border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">{eyebrow}</p>
          <h2 className="headline-md">{headline}</h2>
          <p className="body-lg mt-4 text-fog">{subheadline}</p>
        </div>

        <div className="relative">
          <div className="absolute top-0 bottom-0 left-[11px] hidden w-px bg-stone/30 md:block" />
          <div className="space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, delay: index * 0.08 }}
                className="relative flex gap-8 pb-12 last:pb-0"
              >
                <span className="relative z-10 mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-accent bg-ink text-[0.6rem] text-accent">
                  {index + 1}
                </span>
                <div className="pt-0.5">
                  <h3 className="font-display text-xl text-cream">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
