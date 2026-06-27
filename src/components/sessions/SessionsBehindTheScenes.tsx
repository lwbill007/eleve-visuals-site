"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";

export function SessionsBehindTheScenes({ items }: { items: LightboxItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <p className="label-caps mb-4 text-accent">On Set</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg">Behind the scenes</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.button
              key={`${item.src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
              className="group relative aspect-square overflow-hidden bg-charcoal"
              aria-label={item.type === "video" ? "Play video" : "View photo"}
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <>
                  {item.embed ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                  ) : (
                    <video
                      src={item.src}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/50 bg-ink/40 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
                      <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-cream" />
                    </span>
                  </span>
                </>
              )}
              <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/15" />
            </motion.button>
          ))}
        </div>
      </div>

      <MediaLightbox items={items} index={active} onClose={() => setActive(null)} onNavigate={setActive} />
    </section>
  );
}
