import type { Metadata } from "next";
import { BookingForm } from "@/components/forms/BookingForm";
import { BookingHero } from "@/components/booking/BookingHero";
import { getBookingOptions, getPageCopy } from "@/lib/content";

export const metadata: Metadata = {
  title: "Book a Project",
  description:
    "Submit a project inquiry with ÉLEVÉ Visuals. Premium photography, video production, and creative direction in Sacramento and beyond.",
};

export default async function BookPage() {
  const [bookingOptions, pageCopy] = await Promise.all([getBookingOptions(), getPageCopy()]);

  return (
    <>
      <BookingHero
        headline={pageCopy.bookPage.headline}
        subheadline={pageCopy.bookPage.subheadline}
        notes={pageCopy.bookPage.notes}
      />

      <section className="section-padding">
        <div className="container-narrow">
          <BookingForm bookingOptions={bookingOptions} bookPage={pageCopy.bookPage} />
        </div>
      </section>
    </>
  );
}
