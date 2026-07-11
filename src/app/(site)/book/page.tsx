import type { Metadata } from "next";
import { BookingForm } from "@/components/forms/BookingForm";
import { BookingHero } from "@/components/booking/BookingHero";
import { getBookingOptions, getPageCopy } from "@/lib/content";

export const metadata: Metadata = {
  title: "Start Your Project",
  description:
    "Begin your ÉLEVÉ Visuals production. Tell us about your vision — photography, video, and creative direction in Sacramento and beyond.",
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
