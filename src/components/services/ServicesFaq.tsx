"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ServicesFaq({
  eyebrow,
  headline,
  items,
}: {
  eyebrow: string;
  headline: string;
  items: FaqItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label-caps mb-4 text-accent">{eyebrow}</p>
            <h2 className="headline-md">{headline}</h2>
          </div>
          <div className="lg:col-span-8">
            <div className="divide-y divide-stone/30 border-y border-stone/30">
              {items.map((item, i) => {
                const panelId = `services-faq-panel-${i}`;
                const buttonId = `services-faq-button-${i}`;
                return (
                  <div key={item.question}>
                    <button
                      id={buttonId}
                      type="button"
                      className="flex w-full items-start justify-between gap-4 py-6 text-left"
                      onClick={() => setOpenIndex(openIndex === i ? null : i)}
                      aria-expanded={openIndex === i}
                      aria-controls={panelId}
                    >
                      <span className="text-sm text-cream md:text-base">{item.question}</span>
                      <span
                        className={cn(
                          "mt-1 shrink-0 text-accent transition-transform duration-300",
                          openIndex === i && "rotate-45"
                        )}
                      >
                        +
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={cn(
                        "overflow-hidden transition-all duration-500",
                        openIndex === i ? "max-h-[800px] overflow-y-auto pb-6" : "max-h-0"
                      )}
                      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                    >
                      <p className="text-sm leading-relaxed text-fog">{item.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
