import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  APPROVED_PRICING_PACKAGES,
  MEDIA_DELIVERY_DEFINITIONS,
  PRICING_FAMILY_LABELS,
  type PricingFamily,
} from "@/lib/pricing-config";
import { formatPackagePrice } from "@/lib/booking-packages";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Pricing",
    description:
      "Transparent starting prices for ÉLEVÉ photography, video production, and monthly creative partnerships in Sacramento and the Bay Area.",
    path: "/pricing",
  });
}

const FAMILIES: PricingFamily[] = ["portrait", "motion", "partnership"];

function rate(price: number, billing: "project" | "monthly") {
  return formatPackagePrice(price) + (billing === "monthly" ? "/month" : "");
}

export default function PricingPage() {
  return (
    <>
      <section className="section-padding border-b border-stone/30 pt-36 md:pt-44">
        <div className="container-wide">
          <p className="label-caps text-accent">Pricing</p>
          <h1 className="headline-xl mt-5 max-w-5xl text-balance">
            Cinematic work, scaled to the story.
          </h1>
          <p className="body-lg mt-7 max-w-3xl text-fog">
            Start with a focused experience, add creative direction when it matters, or build a
            complete production. Every level shows its real scope before you inquire.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {FAMILIES.map((family) => (
              <Link
                key={family}
                href={`#${family}`}
                className="border border-stone/50 px-4 py-2 text-xs tracking-[0.14em] text-cream uppercase transition-colors hover:border-accent hover:text-accent"
              >
                {PRICING_FAMILY_LABELS[family]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {FAMILIES.map((family) => {
        const packages = APPROVED_PRICING_PACKAGES.filter((pkg) => pkg.family === family);
        return (
          <section
            key={family}
            id={family}
            className="section-padding scroll-mt-24 border-b border-stone/30"
          >
            <div className="container-wide">
              <div className="mb-10 max-w-3xl">
                <p className="label-caps text-accent">{PRICING_FAMILY_LABELS[family]}</p>
                <h2 className="headline-lg mt-4">
                  {family === "portrait"
                    ? "Focused portraits to editorial production"
                    : family === "motion"
                      ? "Defined edits, no vague video bundles"
                      : "Recurring production with protected capacity"}
                </h2>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className={
                      "flex h-full flex-col border bg-charcoal/20 p-6 md:p-7 " +
                      (pkg.level === "signature"
                        ? "border-accent/70"
                        : "border-stone/35")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] tracking-[0.18em] text-muted uppercase">
                          {pkg.level}
                        </p>
                        <h3 className="mt-3 font-display text-3xl text-cream">{pkg.name}</h3>
                      </div>
                      {pkg.level === "signature" && (
                        <span className="border border-accent/40 px-2 py-1 text-[0.58rem] tracking-[0.13em] text-accent uppercase">
                          More direction
                        </span>
                      )}
                    </div>

                    <p className="mt-5 font-display text-3xl text-accent">
                      From {rate(pkg.price, pkg.billing)}
                    </p>
                    <p className="mt-4 min-h-20 text-sm leading-relaxed text-fog">
                      {pkg.description}
                    </p>

                    <div className="mt-6 border-t border-stone/30 pt-6">
                      <p className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                        Included
                      </p>
                      <ul className="mt-4 space-y-2">
                        {pkg.included.map((item) => (
                          <li key={item} className="flex gap-3 text-sm leading-relaxed text-cream-dim">
                            <span className="text-accent">—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto pt-7">
                      <p className="text-xs text-muted">Delivery: {pkg.estimatedTimeline}</p>
                      <Button
                        href={`/book?package=${pkg.id}`}
                        variant={pkg.level === "signature" ? "primary" : "secondary"}
                        className="mt-5 w-full justify-center"
                      >
                        Inquire about {pkg.name}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="section-padding border-b border-stone/30">
        <div className="container-wide">
          <p className="label-caps text-accent">Video language</p>
          <h2 className="headline-lg mt-4 max-w-3xl">Know what each deliverable means.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              ["Lightly Edited Clip", MEDIA_DELIVERY_DEFINITIONS.lightlyEditedClip],
              ["Standard Reel", MEDIA_DELIVERY_DEFINITIONS.standardReel],
              ["Advanced Promotional Film", MEDIA_DELIVERY_DEFINITIONS.advancedPromotionalFilm],
              ["Raw Clip", MEDIA_DELIVERY_DEFINITIONS.rawClip],
            ].map(([title, description]) => (
              <div key={title} className="border-l border-accent/40 pl-5">
                <h3 className="font-display text-2xl text-cream">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fog">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="label-caps text-accent">Custom production</p>
            <h2 className="headline-lg mt-4 max-w-3xl">When the project exceeds a package.</h2>
            <p className="body-lg mt-6 max-w-3xl text-fog">
              Paid advertising, broad commercial usage, raw footage, events, travel, studio,
              additional crew, talent, multi-camera production, advanced graphics, and complex
              campaigns receive a written custom proposal.
            </p>
          </div>
          <div className="border border-stone/35 bg-charcoal/20 p-6">
            <p className="font-display text-2xl text-cream">Before you reserve</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-fog">
              <li>Projects use a defined proposal, contract, and payment schedule.</li>
              <li>Monthly partnerships have a three-month initial term and no rollover.</li>
              <li>Travel and third-party production costs are quoted separately.</li>
              <li>ÉLEVÉ Sessions remains a separate casting experience.</li>
            </ul>
            <Button href="/book" variant="primary" className="mt-7 w-full justify-center">
              Start an inquiry
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
