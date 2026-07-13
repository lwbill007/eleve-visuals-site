import type { Metadata } from "next";
import { BookingForm } from "@/components/forms/BookingForm";
import { BookingHero } from "@/components/booking/BookingHero";
import { getBookingOptions, getPageCopy, getSiteConfig } from "@/lib/content";
import { buildPageMetadata, siteResponseTime } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const reply = siteResponseTime(site);
  return buildPageMetadata({
    title: "Book Your Experience",
    description: `Start an ÉLEVÉ Visuals inquiry in four short steps. Photography, film, and creative direction — Northern California. Reply ${reply}. No payment online.`,
    path: "/book",
  });
}

export default async function BookPage() {
  const [bookingOptions, pageCopy, site] = await Promise.all([
    getBookingOptions(),
    getPageCopy(),
    getSiteConfig(),
  ]);
  const responseTime = siteResponseTime(site);

  return (
    <>
      <BookingHero
        headline={pageCopy.bookPage.headline}
        subheadline={pageCopy.bookPage.subheadline}
        notes={pageCopy.bookPage.notes}
        responseTime={responseTime}
      />

      <section className="section-padding">
        <div className="container-wide max-w-6xl">
          <BookingForm
            bookingOptions={bookingOptions}
            bookPage={pageCopy.bookPage}
            responseTime={responseTime}
          />
        </div>
      </section>
    </>
  );
}
