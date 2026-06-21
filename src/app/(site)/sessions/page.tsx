import type { Metadata } from "next";
import { PageHero, CTABanner } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getPageCopy, getSessionsContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "ÉLEVÉ Sessions",
  description:
    "An exclusive in-house creative series by ÉLEVÉ Visuals. Curated shoots, collaborations, and portfolio-grade content.",
};

export default async function SessionsPage() {
  const [sessionsContent, pageCopy] = await Promise.all([
    getSessionsContent(),
    getPageCopy(),
  ]);
  const { eventDetails } = sessionsContent;

  return (
    <>
      <PageHero
        eyebrow="Exclusive Series"
        headline={sessionsContent.title}
        subheadline={sessionsContent.tagline}
        image={sessionsContent.heroImage}
        imageAlt={sessionsContent.heroImageAlt}
      />

      <section className="section-padding">
        <div className="container-wide">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="label-caps mb-4">Current Theme</p>
              <h2 className="headline-lg mb-6">{sessionsContent.theme}</h2>
              <p className="text-lg text-accent mb-8">{sessionsContent.themeDescription}</p>
              <div className="space-y-5">
                {sessionsContent.description.map((p, i) => (
                  <p key={i} className="body-lg">{p}</p>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border border-stone/40 p-8 md:p-10 sticky top-28">
                <p className="label-caps mb-6">Session Details</p>
                <dl className="space-y-5">
                  {[
                    { label: "Date", value: eventDetails.date },
                    { label: "Time", value: eventDetails.time },
                    { label: "Location", value: eventDetails.location },
                    { label: "Capacity", value: eventDetails.capacity },
                    { label: "Applications", value: eventDetails.applicationDeadline },
                  ].map((item) => (
                    <div key={item.label} className="border-b border-stone/20 pb-4 last:border-0">
                      <dt className="text-xs tracking-[0.15em] text-muted uppercase">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm text-cream">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-8">
                  <Button
                    variant="primary"
                    href={sessionsContent.applyCta.href}
                    className="w-full"
                  >
                    {sessionsContent.applyCta.label}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-y border-stone/30 bg-ink-soft">
        <div className="container-wide grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="headline-md mb-4">{sessionsContent.mood.headline}</h2>
            <p className="body-lg mb-6">{sessionsContent.mood.description}</p>
            <div className="flex flex-wrap gap-2">
              {sessionsContent.mood.keywords.map((kw) => (
                <span
                  key={kw}
                  className="border border-stone/40 px-3 py-1.5 text-xs tracking-[0.1em] text-fog uppercase"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h2 className="headline-md mb-4">{sessionsContent.expectations.headline}</h2>
            <ul className="space-y-3">
              {sessionsContent.expectations.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-fog">
                  <span className="text-accent">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-narrow">
          <h2 className="headline-md mb-4">{sessionsContent.dressCode.headline}</h2>
          <p className="body-lg">{sessionsContent.dressCode.description}</p>
        </div>
      </section>

      <section className="section-padding border-t border-stone/30 bg-ink-soft">
        <div className="container-wide">
          <h2 className="headline-md mb-10 text-center">Session FAQ</h2>
          <div className="mx-auto max-w-2xl divide-y divide-stone/30">
            {sessionsContent.faq.map((item) => (
              <div key={item.question} className="py-6">
                <h3 className="text-sm text-cream mb-2">{item.question}</h3>
                <p className="text-sm leading-relaxed text-fog">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        headline={pageCopy.sessionsCta.headline}
        subheadline={pageCopy.sessionsCta.subheadline}
        primaryLabel={pageCopy.sessionsCta.primaryLabel}
        primaryHref={pageCopy.sessionsCta.primaryHref}
      />
    </>
  );
}
