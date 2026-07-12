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
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border border-stone/30"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-ink-soft to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(184,168,138,0.14)_0%,transparent_55%)]" />
      <div className="grain absolute inset-0 opacity-50" />

      <div className="relative z-10 px-6 py-12 md:px-12 md:py-16">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="label-caps text-center text-accent"
        >
          Inquiry received
        </motion.p>

        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="font-display mt-4 text-center text-4xl text-cream md:text-6xl"
        >
          {title || "Welcome to ÉLEVÉ."}
        </motion.h2>

        {packageName && (
          <p className="mt-4 text-center text-sm text-fog">
            You selected <span className="text-cream-dim">{packageName}</span>
          </p>
        )}

        {inquiryId && (
          <p className="mt-3 text-center text-xs tracking-[0.16em] text-muted uppercase">
            Reference #{formatInquiryId(inquiryId)}
          </p>
        )}

        <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-fog md:text-lg">
          {message ||
            "We're excited to learn more about your vision. Our team typically responds within 1–2 business days."}
        </p>

        <div className="mx-auto mt-12 max-w-3xl border border-stone/30 bg-ink/40 p-6 md:p-8">
          <p className="label-caps mb-2 text-center text-muted">What happens next</p>
          <ol className="mt-5 space-y-4">
            {nextSteps.map((step, i) => (
              <li key={step} className="flex gap-4 text-sm text-fog md:text-base">
                <span className="font-display text-lg text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed text-cream-dim">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14">
          <p className="label-caps mb-6 text-center text-muted">Your creative journey</p>
          <ol className="mx-auto grid max-w-4xl gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {CLIENT_TIMELINE_STAGES.map((stage, i) => {
              const done = current >= 0 && i <= current;
              const active = i === current;
              return (
                <li
                  key={stage.id}
                  className={cn(
                    "flex items-start gap-3 border-l py-3 pl-4",
                    done ? "border-accent/50" : "border-stone/25"
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
                    {active && <p className="mt-1 text-xs text-accent">You are here</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-12 text-center">
          <Link href="/" className="label-caps link-underline text-accent hover:text-cream">
            Back to home
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-muted">
          Questions?{" "}
          <Link href="/contact" className="text-accent link-underline hover:text-cream">
            Contact us directly
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
