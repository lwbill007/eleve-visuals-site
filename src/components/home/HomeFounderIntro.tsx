import Image from "next/image";
import Link from "next/link";
import type { AboutContent } from "@/lib/types";

export function HomeFounderIntro({ about }: { about: AboutContent }) {
  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden bg-charcoal lg:col-span-5">
            {about.image ? (
              <Image
                src={about.image}
                alt={about.imageAlt || about.headline}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
            )}
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="label-caps mb-4 text-accent">Meet the Founder</p>
            <h2 className="headline-lg max-w-2xl text-balance">{about.headline}</h2>
            <p className="body-lg mt-5 max-w-xl">{about.intro}</p>
            <Link
              href="/about"
              className="mt-8 inline-block w-fit text-xs tracking-[0.2em] text-accent uppercase link-underline"
            >
              Meet Bill →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
