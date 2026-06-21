import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/Section";
import { DEFAULT_BOOKING_TERMS } from "@/lib/defaults";

export const metadata: Metadata = {
  title: "Booking Terms",
  description:
    "Booking terms for ÉLEVÉ Visuals — deposits, turnaround, usage rights, and cancellation policy.",
};

export default function BookingTermsPage() {
  const terms = DEFAULT_BOOKING_TERMS;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        headline={terms.headline}
        subheadline={terms.intro}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-narrow space-y-10">
          {terms.sections.map((section) => (
            <article key={section.title} className="border-t border-stone/30 pt-8">
              <h2 className="headline-sm mb-4">{section.title}</h2>
              <p className="body-md text-fog">{section.body}</p>
            </article>
          ))}

          <p className="border-t border-stone/30 pt-8 text-sm text-muted">
            Ready to move forward?{" "}
            <Link href="/book" className="text-accent underline underline-offset-2">
              Submit a booking request
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
