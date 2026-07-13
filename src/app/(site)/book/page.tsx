import type { Metadata } from "next";
import { BookingForm } from "@/components/forms/BookingForm";
import { BookingHero } from "@/components/booking/BookingHero";
import { getBookingOptions, getPageCopy } from "@/lib/content";

export const metadata: Metadata = {
  title: "Book Your Experience",
  description:
    "Start an ÉLEVÉ Visuals inquiry in four short steps. Photography, film, and creative direction — Northern California. Reply within 1–2 business days. No payment online.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book Your Experience — ÉLEVÉ Visuals",
    description:
      "Inquiry-first booking. Share your service, budget, and vision — we reply within 1–2 business days.",
  },
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
        <div className="container-wide max-w-6xl">
          <BookingForm bookingOptions={bookingOptions} bookPage={pageCopy.bookPage} />
        </div>
      </section>
    </>
  );
}
