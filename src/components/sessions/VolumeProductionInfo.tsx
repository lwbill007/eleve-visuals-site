"use client";

import { motion, useReducedMotion } from "framer-motion";

export function VolumeProductionInfo({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  const reduce = useReducedMotion();

  if (items.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide min-w-0">
        <header className="mb-8 sm:mb-10">
          <p className="label-caps text-fog">Production Details</p>
          <h2 className="headline-md mt-2 text-balance">Production Information</h2>
        </header>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-24px" }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.28) }}
              className="min-w-0 border-t border-stone/30 pt-4"
            >
              <dt className="text-[0.6rem] tracking-[0.2em] text-muted uppercase">{item.label}</dt>
              <dd className="mt-2 font-display text-lg leading-snug break-words text-cream sm:text-xl">
                {item.value}
              </dd>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
