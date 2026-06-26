"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { HomepageSectionCopy, TestimonialDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HomeTestimonials({
  items,
  copy,
}: {
  items: TestimonialDTO[];
  copy: HomepageSectionCopy;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[active];

  return (
    <section className="section-padding border-b border-stone/30 bg-ink">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center md:mb-16"
        >
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg mx-auto max-w-2xl">{copy.headline}</h2>
          {copy.subheadline && (
            <p className="body-lg mx-auto mt-4 max-w-xl text-fog">{copy.subheadline}</p>
          )}
        </motion.div>

        <div className="mx-auto max-w-4xl">
          <div className="relative min-h-[220px] border border-stone/30 bg-charcoal/30 p-10 md:p-14">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={current.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55 }}
                className="text-center"
              >
                <p className="font-display text-2xl leading-snug text-cream md:text-3xl lg:text-4xl">
                  &ldquo;{current.quote}&rdquo;
                </p>
                <footer className="mt-8 flex flex-col items-center gap-3">
                  {current.image && (
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border border-stone/40">
                      <Image
                        src={current.image}
                        alt={current.imageAlt || current.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-cream">{current.name}</p>
                    <p className="mt-1 text-xs tracking-[0.15em] text-muted uppercase">
                      {current.role}
                    </p>
                  </div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {items.length > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className="group flex h-11 items-center px-1"
                  aria-label={`View testimonial ${i + 1}`}
                >
                  <span
                    className={cn(
                      "block h-1 transition-all duration-300",
                      i === active ? "w-10 bg-accent" : "w-4 bg-stone group-hover:bg-muted"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
