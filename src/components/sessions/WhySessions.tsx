"use client";

import { motion } from "framer-motion";
import { SessionIcon, type SessionIconName } from "./SessionIcon";

const CARDS: { title: string; detail: string; icon: SessionIconName }[] = [
  {
    title: "Every Volume Tells a Story",
    detail:
      "Each session is built around a singular theme — a complete narrative realized through styling, light, and direction.",
    icon: "film",
  },
  {
    title: "Creative Community",
    detail:
      "Photographers, models, stylists, and artists collaborate as one cast, building relationships that outlast the shoot.",
    icon: "users",
  },
  {
    title: "Quality Over Quantity",
    detail:
      "Limited spots, considered casting, and full post-production. We produce fewer sessions so each one is exceptional.",
    icon: "gem",
  },
];

export function WhySessions() {
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Ethos</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg">Why ÉLEVÉ Sessions</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
              className="group border border-stone/40 bg-charcoal/30 p-8 transition-colors duration-500 hover:border-accent/50"
            >
              <SessionIcon
                name={card.icon}
                className="h-7 w-7 text-accent transition-transform duration-500 group-hover:scale-110"
              />
              <h3 className="mt-6 font-display text-2xl leading-tight text-cream">{card.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-fog">{card.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
