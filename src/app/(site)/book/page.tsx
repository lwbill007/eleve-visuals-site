import type { Metadata } from "next";
import { BookingForm } from "@/components/forms/BookingForm";
import { BookingHero } from "@/components/booking/BookingHero";
import { TrustSnippet } from "@/components/marketing/TrustSnippet";
import { getBookingOptions, getFeaturedTestimonials, getPageCopy, getSiteConfig } from "@/lib/content";
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
  const [bookingOptions, pageCopy, site, testimonials] = await Promise.all([
    getBookingOptions(),
    getPageCopy(),
    getSiteConfig(),
    getFeaturedTestimonials(),
  ]);
  const responseTime = siteResponseTime(site);
  const testimonial = testimonials[0] ?? null;

  return (
    <>
      <BookingHero
        headline={pageCopy.bookPage.headline}
        subheadline={pageCopy.bookPage.subheadline}
        notes={pageCopy.bookPage.notes}
        responseTime={responseTime}
      />

      <section className="section-padding">
        <div className="container-wide">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5 lg:order-2">
              <div className="lg:sticky lg:top-28">
                <TrustSnippet
                  testimonial={testimonial}
                  responseTime={responseTime}
                  serviceArea={site.serviceArea}
                />
              </div>
            </div>
            <div className="lg:col-span-7 lg:order-1">
              <BookingForm
                bookingOptions={bookingOptions}
                bookPage={pageCopy.bookPage}
                responseTime={responseTime}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
