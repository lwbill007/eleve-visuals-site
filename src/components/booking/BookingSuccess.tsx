"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { FormSuccess } from "@/components/ui/Form";
import { formatInquiryId } from "@/lib/booking";
import { CLIENT_TIMELINE_STAGES, clientTimelineIndex } from "@/lib/booking-pipeline";
import { cn } from "@/lib/utils";

export function BookingSuccess({
  title,
  message,
  nextSteps,
  inquiryId,
  status = "lead",
}: {
  title: string;
  message: string;
  nextSteps: string[];
  inquiryId?: string;
  status?: string;
}) {
  const reduceMotion = useReducedMotion();
  const current = clientTimelineIndex(status);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-none border border-stone/30 bg-charcoal/20 p-8 backdrop-blur-sm md:p-12"
    >
      {inquiryId && (
        <p className="label-caps mb-6 text-center text-accent">
          Inquiry #{formatInquiryId(inquiryId)}
        </p>
      )}

      <div className="mb-10">
        <p className="label-caps mb-4 text-center text-muted">Your project timeline</p>
        <ol className="mx-auto flex max-w-3xl flex-col gap-0 sm:flex-row sm:items-start sm:justify-between">
          {CLIENT_TIMELINE_STAGES.map((stage, i) => {
            const done = current >= 0 && i <= current;
            const active = i === current;
            return (
              <li
                key={stage.id}
                className={cn(
                  "relative flex flex-1 flex-row items-center gap-3 border-l border-stone/30 py-2 pl-4 sm:flex-col sm:border-l-0 sm:border-t sm:px-1 sm:pt-4 sm:pb-0 sm:pl-0",
                  done ? "border-accent/50" : "border-stone/25"
                )}
              >
                <span
                  className={cn(
                    "flex h-2 w-2 shrink-0 rounded-full sm:absolute sm:-top-1 sm:left-1/2 sm:-translate-x-1/2",
                    active ? "bg-accent" : done ? "bg-accent/60" : "bg-stone/40"
                  )}
                />
                <span
                  className={cn(
                    "text-[0.65rem] leading-snug tracking-[0.06em] uppercase sm:mt-2 sm:text-center",
                    active ? "text-cream" : done ? "text-cream-dim" : "text-muted"
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-center text-xs text-fog">
          You&apos;re at <span className="text-cream">Inquiry Received</span>. We&apos;ll advance this
          timeline as your production moves forward.
        </p>
      </div>

      <FormSuccess
        title={title}
        message={message}
        nextSteps={nextSteps}
        actionLabel="Back to home"
        actionHref="/"
      />
      <p className="mt-8 text-center text-xs text-muted">
        Questions?{" "}
        <Link href="/contact" className="text-accent link-underline hover:text-cream">
          Contact us directly
        </Link>
      </p>
    </motion.div>
  );
}
