import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, CTABanner } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getPageCopy, getServices, getServicesIntro } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Photography, videography, creative direction, brand content, event coverage, and social media content by ÉLEVÉ Visuals.",
};

export default async function ServicesPage() {
  const [services, intro, pageCopy] = await Promise.all([
    getServices(),
    getServicesIntro(),
    getPageCopy(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Services"
        headline={intro.headline}
        subheadline={intro.subheadline}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-wide space-y-24 md:space-y-32">
          {services.map((service, index) => (
            <article
              key={service.id}
              id={service.slug}
              className="scroll-mt-28 grid gap-8 lg:grid-cols-12 lg:gap-12"
            >
              <div
                className={`relative aspect-[4/3] overflow-hidden bg-charcoal lg:aspect-auto lg:min-h-[480px] ${
                  index % 2 === 0 ? "lg:col-span-5" : "lg:col-span-5 lg:col-start-8 lg:row-start-1"
                }`}
              >
                {service.image ? (
                  <Image
                    src={service.image}
                    alt={service.imageAlt || service.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                )}
              </div>

              <div
                className={`flex flex-col justify-center ${
                  index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-7 lg:col-start-1 lg:row-start-1"
                }`}
              >
                <p className="label-caps mb-3">{service.tagline}</p>
                <h2 className="headline-md">{service.title}</h2>
                <p className="body-lg mt-4">{service.description}</p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs tracking-[0.15em] text-muted uppercase mb-2">
                      Who it&apos;s for
                    </p>
                    <p className="text-sm leading-relaxed text-fog">{service.forWhom}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.15em] text-muted uppercase mb-2">
                      Starting at
                    </p>
                    <p className="font-display text-2xl text-accent">{service.startingPrice}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-xs tracking-[0.15em] text-muted uppercase mb-3">
                    What&apos;s included
                  </p>
                  <ul className="space-y-2">
                    {service.includes.map((item) => (
                      <li key={item} className="flex gap-3 text-sm text-fog">
                        <span className="text-accent">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Button variant="primary" href="/book">
                    Book / Inquire
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-padding border-t border-stone/30 bg-ink-soft">
        <div className="container-narrow text-center">
          <p className="body-lg">
            Not sure which service fits?{" "}
            <Link href="/contact" className="text-accent link-underline hover:text-cream">
              Send a message
            </Link>{" "}
            or fill out the{" "}
            <Link href="/book" className="text-accent link-underline hover:text-cream">
              booking form
            </Link>{" "}
            with your project details — I&apos;ll recommend the right scope.
          </p>
        </div>
      </section>

      <CTABanner
        headline={pageCopy.servicesCta.headline}
        primaryLabel={pageCopy.servicesCta.primaryLabel}
        primaryHref={pageCopy.servicesCta.primaryHref}
        secondaryLabel={pageCopy.servicesCta.secondaryLabel}
        secondaryHref={pageCopy.servicesCta.secondaryHref}
      />
    </>
  );
}
