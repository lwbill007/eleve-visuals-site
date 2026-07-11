"use client";

import { cn } from "@/lib/utils";
import { BOOKING_STEPS } from "@/lib/booking";

export function BookingProgress({ currentStep }: { currentStep: number }) {
  const pct = Math.round((currentStep / BOOKING_STEPS.length) * 100);
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={BOOKING_STEPS.length}
      aria-valuenow={currentStep}
      aria-label={`Step ${currentStep} of ${BOOKING_STEPS.length}: ${BOOKING_STEPS[currentStep - 1]?.label ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-xs tracking-[0.15em] text-muted uppercase">
        <span className="shrink-0">
          Step {currentStep} of {BOOKING_STEPS.length}
        </span>
        <span className="truncate text-right" aria-current="step">
          {BOOKING_STEPS[currentStep - 1]?.label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {BOOKING_STEPS.map((step) => (
          <div
            key={step.id}
            className={cn(
              "h-0.5 flex-1 transition-all duration-500",
              step.id <= currentStep ? "bg-accent" : "bg-stone/40"
            )}
            style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
            aria-hidden
          />
        ))}
      </div>
      <span className="sr-only">{pct}% complete</span>
    </div>
  );
}
