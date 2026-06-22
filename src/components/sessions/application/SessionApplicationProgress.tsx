"use client";

import { cn } from "@/lib/utils";
import { APPLICATION_STEPS } from "@/lib/session-application";

export function SessionApplicationProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between text-xs tracking-[0.15em] text-muted uppercase">
        <span>
          Step {currentStep} of {APPLICATION_STEPS.length}
        </span>
        <span>{APPLICATION_STEPS[currentStep - 1]?.label}</span>
      </div>
      <div className="flex gap-1.5">
        {APPLICATION_STEPS.map((step) => (
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
