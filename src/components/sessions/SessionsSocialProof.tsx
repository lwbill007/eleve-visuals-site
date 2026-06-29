"use client";

import { motion } from "framer-motion";
import { useCountUp, useInViewOnce } from "@/hooks/useCountUp";

export interface ProofStat {
  value: string;
  label: string;
}

function Stat({ stat, index }: { stat: ProofStat; index: number }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const display = useCountUp(stat.value, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: index * 0.08 }}
      className="text-center"
    >
      <p className="font-display text-4xl text-cream md:text-6xl">{display}</p>
      <p className="label-caps mt-3 text-[0.55rem] text-muted">{stat.label}</p>
    </motion.div>
  );
}

export function SessionsSocialProof({ stats }: { stats: ProofStat[] }) {
  const visible = stats.filter((s) => s.value && s.label);
  if (visible.length === 0) return null;

  return (
    <section className="border-b border-stone/30 bg-ink">
      <div className="container-wide section-padding py-16 md:py-24">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-8">
          {visible.map((stat, i) => (
            <Stat key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
