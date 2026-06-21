import type { Metadata } from "next";
import { PageHero } from "@/components/ui/Section";
import { BookingForm } from "@/components/forms/BookingForm";
import { getBookingOptions, getPageCopy } from "@/lib/content";

export const metadata: Metadata = {
  title: "Book a Shoot",
  description:
    "Request a booking with ÉLEVÉ Visuals. Photography, videography, and creative direction in Sacramento and the Bay Area.",
};

export default async function BookPage() {
  const [bookingOptions, pageCopy] = await Promise.all([getBookingOptions(), getPageCopy()]);

  return (
    <>
      <PageHero
        eyebrow="Booking"
        headline={pageCopy.bookPage.headline}
        subheadline={pageCopy.bookPage.subheadline}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <div className="mb-12 border border-stone/30 p-6 text-sm text-fog">
            <p className="text-cream-dim mb-2">Before you submit</p>
            <ul className="space-y-1.5">
              {pageCopy.bookPage.notes.map((note) => (
                <li key={note}>— {note}</li>
              ))}
            </ul>
          </div>

          <BookingForm bookingOptions={bookingOptions} bookPage={pageCopy.bookPage} />
        </div>
      </section>
    </>
  );
}
