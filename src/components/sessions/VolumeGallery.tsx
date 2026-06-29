"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MediaLightbox, type LightboxItem } from "./MediaLightbox";

const ASPECTS = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[5/4]"];

export function VolumeGallery({
  title,
  subtitle,
  items,
  tone = "default",
  id,
}: {
  title: string;
  subtitle?: string;
  items: LightboxItem[];
  tone?: "default" | "soft";
  id?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <section
      id={id}
      className={`section-padding border-b border-stone/30 ${tone === "soft" ? "bg-ink-soft" : ""}`}
    >
      <div className="container-wide">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="label-caps text-fog">{title}</p>
            {subtitle && <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p>}
          </div>
          <span className="hidden text-xs text-muted sm:block">{items.length} frames</span>
        </div>

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((item, i) => (
            <motion.button
              key={`${item.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: Math.min((i % 6) * 0.05, 0.3) }}
              className={`group relative mb-4 block w-full break-inside-avoid overflow-hidden bg-charcoal ${ASPECTS[i % ASPECTS.length]}`}
            >
              {item.type === "video" ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cream/50">
                      <span className="ml-1 border-y-[8px] border-l-[13px] border-y-transparent border-l-cream" />
                    </span>
                  </div>
                  {item.src && !item.embed && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={item.src} muted className="h-full w-full object-cover" preload="metadata" />
                  )}
                </>
              ) : (
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}
              <div className="grain pointer-events-none absolute inset-0 opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              {item.alt && (
                <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-xs tracking-wide text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  {item.alt}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <MediaLightbox items={items} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
    </section>
  );
}
