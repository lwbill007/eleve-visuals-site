"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/ui/Section";
import type { TestimonialDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TestimonialsProps {
  items: TestimonialDTO[];
}

export function Testimonials({ items }: TestimonialsProps) {
  const [active, setActive] = useState(0);

  if (items.length === 0) return null;

  return (
    <section className="section-padding border-t border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <SectionHeader
          eyebrow="Client Words"
          headline="Trusted by people who care about the details."
          align="center"
        />

        <div className="mx-auto max-w-3xl">
          <blockquote className="text-center">
            <p className="font-display text-2xl leading-snug text-cream md:text-3xl lg:text-4xl">
              &ldquo;{items[active]?.quote}&rdquo;
            </p>
            <footer className="mt-8">
              <p className="text-sm text-cream">{items[active]?.name}</p>
              <p className="text-xs tracking-wide text-muted uppercase">
                {items[active]?.role}
              </p>
            </footer>
          </blockquote>

          {items.length > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-1 transition-all duration-300",
                    i === active ? "w-8 bg-accent" : "w-4 bg-stone hover:bg-muted"
                  )}
                  aria-label={`View testimonial ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
