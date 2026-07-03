"use client";

import type { SessionVolumeStatus } from "@/lib/types";
import { motion, useReducedMotion } from "framer-motion";
import { SessionIcon, type SessionIconName } from "./SessionIcon";

const STEPS: { label: string; icon: SessionIconName }[] = [
  { label: "Applications", icon: "doc" },
  { label: "Casting", icon: "users" },
  { label: "Creative Planning", icon: "compass" },
  { label: "Wardrobe", icon: "layers" },
  { label: "Shoot Day", icon: "camera" },
  { label: "Editing", icon: "film" },
  { label: "Gallery Release", icon: "image" },
  { label: "Awards", icon: "award" },
];

function currentStepIndex(status: SessionVolumeStatus): number {
  switch (status) {
    case "coming_soon":
    case "applications_open":
      return 0;
    case "applications_closed":
    case "sold_out":
      return 1;
    case "completed":
    case "archived":
      return STEPS.length - 1;
    default:
      return 0;
  }
}

export function VolumeTimeline({ status }: { status: SessionVolumeStatus }) {
  const reduce = useReducedMotion();
  const current = currentStepIndex(status);
  const allComplete = status === "completed" || status === "archived";

  function state(i: number): "complete" | "active" | "upcoming" {
    if (allComplete) return "complete";
    if (i < current) return "complete";
    if (i === current) return "active";
    return "upcoming";
  }

  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft/30">
      <div className="container-wide min-w-0">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <p className="label-caps text-fog">Production Timeline</p>
          <h2 className="headline-md mt-2 text-balance">The Journey</h2>
        </motion.header>

        <div className="hidden lg:block">
          <div className="grid grid-cols-8 gap-2">
            {STEPS.map((step, i) => {
              const s = state(i);
              return (
                <motion.div
                  key={step.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="relative flex flex-col items-center text-center"
                >
                  {i < STEPS.length - 1 && (
                    <motion.span
                      initial={reduce ? false : { scaleX: 0 }}
                      whileInView={reduce ? undefined : { scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.05 + 0.1 }}
                      className={`absolute top-6 left-1/2 h-px w-full origin-left ${
                        state(i + 1) === "upcoming" ? "bg-stone/30" : "bg-accent/60"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-colors duration-500 ${
                      s === "complete"
                        ? "border-accent bg-accent/15 text-accent"
                        : s === "active"
                          ? "border-accent bg-accent text-ink"
                          : "border-stone/40 bg-ink text-stone"
                    }`}
                  >
                    <SessionIcon name={s === "complete" ? "check" : step.icon} className="h-5 w-5" />
                  </span>
                  <p
                    className={`mt-3 text-xs tracking-[0.1em] uppercase ${
                      s === "upcoming" ? "text-muted" : "text-cream"
                    }`}
                  >
                    {step.label}
                  </p>
                  {s === "active" && (
                    <p className="mt-1 text-[0.6rem] tracking-[0.15em] text-accent uppercase">In progress</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-0 lg:hidden">
          {STEPS.map((step, i) => {
            const s = state(i);
            return (
              <motion.div
                key={step.label}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {i < STEPS.length - 1 && (
                  <span
                    className={`absolute top-10 left-[19px] h-full w-px ${
                      state(i + 1) === "upcoming" ? "bg-stone/30" : "bg-accent/60"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    s === "complete"
                      ? "border-accent bg-accent/15 text-accent"
                      : s === "active"
                        ? "border-accent bg-accent text-ink"
                        : "border-stone/40 bg-ink text-stone"
                  }`}
                >
                  <SessionIcon name={s === "complete" ? "check" : step.icon} className="h-4 w-4" />
                </span>
                <div className="pt-2">
                  <p className={`text-sm ${s === "upcoming" ? "text-muted" : "text-cream"}`}>{step.label}</p>
                  {s === "active" && (
                    <p className="text-[0.65rem] tracking-[0.12em] text-accent uppercase">In progress</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
