"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomepageSectionCopy, ServiceDTO } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { trackEngagement } from "@/lib/analytics-client";

function serviceImage(service: ServiceDTO): string | null {
  return service.bannerImage || service.thumbnailImage || service.image;
}

export function HomeServicesPreview({
  services,
  copy,
}: {
  services: ServiceDTO[];
  copy: HomepageSectionCopy;
}) {
  if (services.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-12 max-w-3xl md:mb-16">
          {copy.eyebrow && <p className="label-caps mb-4 text-accent">{copy.eyebrow}</p>}
          <h2 className="headline-lg">{copy.headline}</h2>
          {copy.subheadline && <p className="body-lg mt-5 text-fog">{copy.subheadline}</p>}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {services.slice(0, 3).map((service) => {
            const image = serviceImage(service);
            return (
              <article
                key={service.id}
                className="group relative overflow-hidden bg-charcoal"
              >
                <Link
                  href={`/services#${service.slug}`}
                  onClick={() =>
                    trackEngagement({
                      event: "cta_click",
                      path: "/",
                      label: `home_service_${service.slug}`,
                    })
                  }
                  className="block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {image ? (
                      <Image
                        src={image}
                        alt={service.imageAlt || service.title}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-[1.1s] group-hover:scale-[1.04]"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <h3 className="font-display text-2xl md:text-3xl">{service.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fog">
                      {service.tagline || service.description}
                    </p>
                    <span className="label-caps mt-5 inline-block text-accent opacity-80 transition-opacity group-hover:opacity-100">
                      Explore →
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            href="/services"
            onClick={() =>
              trackEngagement({ event: "cta_click", path: "/", label: "home_services_all" })
            }
          >
            View all services
          </Button>
        </div>
      </div>
    </section>
  );
}
