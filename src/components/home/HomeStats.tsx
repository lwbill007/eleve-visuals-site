"use client";

import { motion } from "framer-motion";
import type { HomepageStat } from "@/lib/types";
import { useCountUp, useInViewOnce } from "@/hooks/useCountUp";

function StatItem({ stat, index }: { stat: HomepageStat; index: number }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const display = useCountUp(stat.value, inView && !!stat.value);

  if (!stat.enabled || !stat.label || !stat.value?.trim()) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: index * 0.08 }}
      className="border border-stone/30 bg-ink-soft/50 p-8 text-center backdrop-blur-sm md:text-left"
    >
      <p className="font-display text-4xl text-cream md:text-5xl">
        {display}
      </p>
      <p className="label-caps mt-3 text-[0.55rem] text-muted">{stat.label}</p>
    </motion.div>
  );
}

export function HomeStats({ enabled, items }: { enabled: boolean; items: HomepageStat[] }) {
  const visible = items.filter((s) => s.enabled && s.label && s.value?.trim());
  if (!enabled || visible.length === 0) return null;

  return (
    <section className="border-b border-stone/30 bg-ink">
      <div className="container-wide section-padding py-14 md:py-20">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-5">
          {visible.map((stat, index) => (
            <StatItem key={`${stat.label}-${index}`} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
