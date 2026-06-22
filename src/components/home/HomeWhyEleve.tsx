"use client";

import { motion } from "framer-motion";
import type { BrandStory, HomepageSectionCopy, HomepageWhyPillar } from "@/lib/types";

export function HomeWhyEleve({
  brandStory,
  copy,
  pillars,
}: {
  brandStory: BrandStory;
  copy: HomepageSectionCopy;
  pillars: HomepageWhyPillar[];
}) {
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5"
          >
            <p className="label-caps mb-4 text-accent">{copy.eyebrow || brandStory.eyebrow}</p>
            <h2 className="headline-lg text-balance">{copy.headline || brandStory.headline}</h2>
            {copy.subheadline && <p className="body-lg mt-5 text-fog">{copy.subheadline}</p>}
            <div className="mt-8 space-y-5">
              {brandStory.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-fog md:text-base">
                  {p}
                </p>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.75, delay: index * 0.06 }}
                className="border border-stone/30 bg-ink/40 p-6 backdrop-blur-sm"
              >
                <p className="font-display text-xl text-cream">{pillar.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-fog">{pillar.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
