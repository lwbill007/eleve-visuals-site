import Image from "next/image";
import Link from "next/link";
import type { AboutContent } from "@/lib/types";

export function HomeFounderIntro({ about }: { about: AboutContent }) {
  return (
    <section className="section-padding border-b border-ink/15 bg-cream text-ink">
      <div className="container-wide">
        <div className="grid gap-10 border-t border-ink/70 pt-6 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[16/11] overflow-hidden bg-charcoal lg:col-span-5">
            {about.image ? (
              <Image
                src={about.image}
                alt={about.imageAlt || about.headline}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : (
              <div className="absolute inset-0 bg-charcoal" />
            )}
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.24em] text-ink/55">
              The Creative Lead
            </p>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(2.8rem,5vw,5.5rem)] leading-[0.92] tracking-[-0.04em] text-balance">
              Directed from first idea to final frame.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/65 md:text-lg">
              {about.intro ||
                "Bill Cook leads concept, photography, film, and finish — so every format belongs to the same world."}
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex min-h-11 w-fit items-center border-b border-ink text-xs font-medium tracking-[0.18em] uppercase"
            >
              Meet Bill &amp; the process →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
