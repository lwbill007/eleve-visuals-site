import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/Section";
import { getBookingTerms } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const terms = await getBookingTerms();
  return buildPageMetadata({
    title: "Booking Terms",
    description:
      terms.intro?.slice(0, 160) ||
      "Booking terms for ÉLEVÉ Visuals — deposits, turnaround, usage rights, and cancellation policy.",
    path: "/booking-terms",
  });
}

export default async function BookingTermsPage() {
  const terms = await getBookingTerms();

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
              <p className="body-md whitespace-pre-line">{section.body}</p>
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
