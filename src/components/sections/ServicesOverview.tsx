import Link from "next/link";
import { SectionHeader } from "@/components/ui/Section";
import type { HomeServiceCard } from "@/lib/types";

interface ServicesOverviewProps {
  services: HomeServiceCard[];
}

export function ServicesOverview({ services }: ServicesOverviewProps) {
  if (services.length === 0) {
    return null;
  }

  return (
    <section className="section-padding border-y border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <SectionHeader
          eyebrow="Services"
          headline="Everything you need to look the part."
          subheadline="Photography, film, and creative direction — scoped to your project, not pulled from a price sheet."
        />

        <div className="grid gap-px bg-stone/30 md:grid-cols-2">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group bg-ink-soft p-8 transition-colors duration-500 hover:bg-charcoal/50 md:p-10"
            >
              <h3 className="font-display text-2xl md:text-3xl">{service.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-fog">
                {service.description}
              </p>
              <span className="mt-6 inline-block text-xs tracking-[0.2em] text-accent uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
