"use client";

import { cn } from "@/lib/utils";
import { BOOKING_STEPS } from "@/lib/booking";

export function BookingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between text-xs tracking-[0.15em] text-muted uppercase">
        <span>
          Step {currentStep} of {BOOKING_STEPS.length}
        </span>
        <span>{BOOKING_STEPS[currentStep - 1]?.label}</span>
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
    </div>
  );
}
