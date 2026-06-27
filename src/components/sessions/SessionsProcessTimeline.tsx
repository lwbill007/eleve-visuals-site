"use client";

import { motion } from "framer-motion";

const STEPS = [
  "Applications",
  "Selections",
  "Prep Guide",
  "Mood Board",
  "Shoot Day",
  "Gallery Delivery",
  "Alumni",
];

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function SessionsProcessTimeline() {
  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-14 text-center">
          <p className="label-caps mb-4 text-accent">How It Works</p>
          <h2 className="headline-md">The production timeline</h2>
        </div>

        {/* Horizontal — md and up */}
        <div className="relative hidden md:block">
          <span className="absolute top-[18px] right-[7.14%] left-[7.14%] h-px bg-stone/40" />
          <ol className="relative flex justify-between">
            {STEPS.map((step, i) => (
              <motion.li
                key={step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reveal}
                className="flex w-[14.28%] flex-col items-center text-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/60 bg-ink text-xs text-accent">
                  {i + 1}
                </span>
                <span className="mt-4 text-xs leading-snug tracking-wide text-cream">{step}</span>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Vertical — mobile */}
        <ol className="md:hidden">
          {STEPS.map((step, i) => (
            <motion.li
              key={step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
              className="relative flex gap-5 pb-8 last:pb-0"
            >
              {i < STEPS.length - 1 && (
                <span className="absolute top-9 left-[17px] h-full w-px bg-stone/40" />
              )}
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/60 bg-ink text-xs text-accent">
                {i + 1}
              </span>
              <span className="mt-2 text-sm tracking-wide text-cream">{step}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
