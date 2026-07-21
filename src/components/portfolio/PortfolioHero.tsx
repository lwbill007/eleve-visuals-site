"use client";

import Image from "next/image";
import type { PortfolioPageContent } from "@/lib/types";

export function PortfolioHero({ content }: { content: PortfolioPageContent["hero"] }) {
  const { eyebrow, headline, subheadline, description, image, imageAlt, videoUrl } = content;

  return (
    <section className="relative flex min-h-[72dvh] items-end overflow-hidden bg-ink md:min-h-[86dvh]">
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={image || undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : image ? (
        <Image
          src={image}
          alt={imageAlt || headline}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(184,168,138,0.11),transparent_34%),linear-gradient(135deg,#111111_0%,#0a0a0a_48%,#070707_100%)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,10,0.98)_0%,rgba(10,10,10,0.72)_46%,rgba(10,10,10,0.16)_100%)]" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 w-full px-5 pb-12 pt-32 sm:px-8 md:pb-20 lg:px-12">
        <div className="container-wide">
          <div className="grid gap-7 border-t border-cream/30 pt-5 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="label-caps mb-5 text-accent">{eyebrow}</p>
              <h1 className="max-w-5xl font-display text-[clamp(3.6rem,8vw,8.5rem)] leading-[0.86] tracking-[-0.05em] text-balance">
                {headline}
              </h1>
            </div>
            <div className="max-w-xl md:col-span-4 md:pb-2">
              <p className="font-display text-xl leading-snug text-cream-dim md:text-2xl">
                {subheadline}
              </p>
              {description ? (
                <p className="mt-4 text-sm leading-relaxed text-fog md:text-base">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
