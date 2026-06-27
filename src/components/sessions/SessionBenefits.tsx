"use client";

import { motion } from "framer-motion";
import { SessionIcon, type SessionIconName } from "./SessionIcon";

interface BenefitItem {
  title: string;
  detail: string;
  icon: SessionIconName;
}

interface BenefitPhase {
  phase: string;
  items: BenefitItem[];
}

const PHASES: BenefitPhase[] = [
  {
    phase: "Before the Session",
    items: [
      { title: "Acceptance", detail: "A personal invitation into the volume.", icon: "check" },
      { title: "Prep Guide", detail: "Wardrobe, references, and call sheet.", icon: "doc" },
      { title: "Mood Board", detail: "The visual language for the shoot.", icon: "layers" },
    ],
  },
  {
    phase: "During the Session",
    items: [
      { title: "Creative Direction", detail: "Guided, intentional direction on set.", icon: "compass" },
      { title: "BTS Coverage", detail: "Documented moments behind the lens.", icon: "camera" },
      { title: "Networking", detail: "Collaborate with a curated cast.", icon: "users" },
      { title: "Refreshments", detail: "Catering to keep the energy high.", icon: "cup" },
    ],
  },
  {
    phase: "After the Session",
    items: [
      { title: "Edited Images", detail: "Hand-retouched final selects.", icon: "image" },
      { title: "Social Versions", detail: "Formatted cuts for every platform.", icon: "share" },
      { title: "Gallery", detail: "Your private delivery gallery.", icon: "grid" },
      { title: "Recap Film", detail: "A cinematic recap of the day.", icon: "film" },
      { title: "Credit", detail: "Tagged and credited across channels.", icon: "tag" },
    ],
  },
  {
    phase: "Alumni Benefits",
    items: [
      { title: "Priority Applications", detail: "First access to future volumes.", icon: "star" },
      { title: "Community Access", detail: "An ongoing creative circle.", icon: "users" },
      { title: "Exclusive Projects", detail: "Invite-only collaborations.", icon: "sparkle" },
      { title: "Future Drops", detail: "Early looks at what's next.", icon: "gift" },
    ],
  },
];

export function SessionBenefits() {
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Experience</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">Everything a session includes</h2>
          <p className="body-lg mt-5">
            From the first invitation to a lasting place in the alumni circle — each volume is a
            fully produced, end-to-end creative experience.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((phase) => (
            <div key={phase.phase}>
              <h3 className="mb-6 text-xs tracking-[0.18em] text-fog uppercase">{phase.phase}</h3>
              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                className="space-y-3"
              >
                {phase.items.map((item) => (
                  <motion.li
                    key={item.title}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="group flex gap-4 border border-stone/40 bg-charcoal/30 p-4 transition-colors duration-500 hover:border-accent/50 hover:bg-charcoal/60"
                  >
                    <SessionIcon
                      name={item.icon}
                      className="mt-0.5 h-5 w-5 shrink-0 text-fog transition-colors duration-500 group-hover:text-accent"
                    />
                    <div>
                      <p className="text-sm text-cream">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fog">{item.detail}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
