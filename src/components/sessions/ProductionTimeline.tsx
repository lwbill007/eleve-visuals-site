"use client";

import { motion } from "framer-motion";
import { PRODUCTION_TIMELINE } from "@/lib/sessions-experience";

export function ProductionTimeline() {
  return (
    <section className="section-padding overflow-hidden border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Production</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">From application to legacy</h2>
          <p className="body-lg mt-5">
            Every Volume runs like a real production. Here&rsquo;s the arc from the moment you apply
            to the day your work joins the archive.
          </p>
        </div>

        <div className="relative">
          <div className="absolute top-8 right-0 left-0 hidden h-px bg-stone/30 md:block" />
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-7 md:gap-4 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            {PRODUCTION_TIMELINE.map((stage, index) => (
              <motion.div
                key={stage.step}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="w-[70%] shrink-0 snap-start xs:w-[55%] sm:w-[40%] md:w-auto md:min-w-0"
              >
                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-accent/60 bg-ink text-xs text-accent">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-display text-lg text-cream">{stage.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{stage.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
