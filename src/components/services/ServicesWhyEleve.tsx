"use client";

import { motion } from "framer-motion";
import type { ServicesPillar } from "@/lib/types";

export function ServicesWhyEleve({
  eyebrow,
  headline,
  items,
}: {
  eyebrow: string;
  headline: string;
  items: ServicesPillar[];
}) {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="mb-14 text-center">
          <p className="label-caps mb-4 text-accent">{eyebrow}</p>
          <h2 className="headline-md mx-auto max-w-2xl">{headline}</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
              className="border border-stone/30 p-8 transition-colors duration-500 hover:border-accent/30 hover:bg-charcoal/20"
            >
              <div className="mb-4 h-px w-8 bg-accent" />
              <h3 className="font-display text-xl text-cream">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fog">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
