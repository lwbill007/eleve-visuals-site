"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";

const ASPECTS = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[3/5]", "aspect-[5/6]"];

export function CinematicGallery({ items }: { items: LightboxItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Work</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">Frames from the archive</h2>
          <p className="body-lg mt-5">
            A look across the Volumes — the stills, the sets, the moments between takes.
          </p>
        </div>

        <div className="columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
          {items.map((item, i) => (
            <motion.button
              key={`${item.src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
              aria-label={item.type === "video" ? "Play video" : "View photo"}
              className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden bg-charcoal md:mb-4 ${
                item.type === "video" ? "aspect-video" : ASPECTS[i % ASPECTS.length]
              }`}
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <>
                  {item.embed ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                  ) : (
                    <video src={item.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cream/50 bg-ink/40 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
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
