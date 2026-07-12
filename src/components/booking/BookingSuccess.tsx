"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { formatInquiryId } from "@/lib/booking";
import { CLIENT_TIMELINE_STAGES, clientTimelineIndex } from "@/lib/booking-pipeline";
import { cn } from "@/lib/utils";

export function BookingSuccess({
  title,
  message,
  nextSteps,
  inquiryId,
  status = "lead",
  packageName,
}: {
  title: string;
  message: string;
  nextSteps: string[];
  inquiryId?: string;
  status?: string;
  packageName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const current = clientTimelineIndex(status);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden border border-stone/30 bg-gradient-to-b from-charcoal/40 via-ink-soft/80 to-ink p-8 md:p-12"
    >
      <p className="label-caps text-center text-accent">Inquiry received</p>
      <h2 className="font-display mt-4 text-center text-4xl text-cream md:text-5xl">{title}</h2>
      {packageName && (
        <p className="mt-3 text-center text-sm text-fog">
          Experience selected: <span className="text-cream-dim">{packageName}</span>
        </p>
      )}
      {inquiryId && (
        <p className="mt-4 text-center text-xs tracking-[0.14em] text-muted uppercase">
          Reference #{formatInquiryId(inquiryId)}
        </p>
      )}

      <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-fog">{message}</p>

      <div className="mt-12">
        <p className="label-caps mb-6 text-center text-muted">Your creative journey</p>
        <ol className="mx-auto grid max-w-4xl gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {CLIENT_TIMELINE_STAGES.map((stage, i) => {
            const done = current >= 0 && i <= current;
            const active = i === current;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-start gap-3 border-l border-stone/30 py-3 pl-4",
                  done ? "border-accent/45" : "border-stone/25"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    active ? "bg-accent" : done ? "bg-accent/55" : "bg-stone/40"
                  )}
                />
                <div>
                  <span
                    className={cn(
                      "text-[0.65rem] tracking-[0.08em] uppercase",
                      active ? "text-cream" : done ? "text-cream-dim" : "text-muted"
                    )}
                  >
                    {stage.label}
                  </span>
                  {active && (
                    <p className="mt-1 text-xs text-accent">You are here</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-10">
        <div className="mx-auto max-w-xl text-left">
          <p className="label-caps mb-4 text-center">What happens next</p>
          <ol className="space-y-3">
            {nextSteps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-fog">
                <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center">
            <Link href="/" className="label-caps link-underline text-accent hover:text-cream">
              Back to home
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Questions?{" "}
        <Link href="/contact" className="text-accent link-underline hover:text-cream">
          Contact us directly
        </Link>
      </p>
    </motion.div>
  );
}
