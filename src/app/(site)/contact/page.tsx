import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/Section";
import { ContactForm } from "@/components/forms/ContactForm";
import { FAQ } from "@/components/sections/FAQ";
import { getContactPage, getFaqItems, getSiteConfig } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with ÉLEVÉ Visuals for photography, videography, and creative direction inquiries.",
};

export default async function ContactPage() {
  const [siteConfig, contactPage, faqItems] = await Promise.all([
    getSiteConfig(),
    getContactPage(),
    getFaqItems(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        headline={contactPage.headline}
        subheadline={contactPage.subheadline}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-wide">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="space-y-8 lg:sticky lg:top-28">
                <div>
                  <p className="label-caps mb-3">Email</p>
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="font-display text-xl text-cream transition-colors hover:text-accent sm:text-2xl break-words"
                  >
                    {siteConfig.email}
                  </a>
                </div>

                <div>
                  <p className="label-caps mb-3">Instagram</p>
                  <a
                    href={siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-xl text-cream transition-colors hover:text-accent sm:text-2xl break-words"
                  >
                    @{siteConfig.instagram}
                  </a>
                </div>

                <div>
                  <p className="label-caps mb-3">Service Area</p>
                  <p className="text-sm text-fog">{siteConfig.serviceArea}</p>
                </div>

                <div>
                  <p className="label-caps mb-3">Response Time</p>
                  <p className="text-sm text-fog">{siteConfig.responseTime}</p>
                </div>

                <div className="border border-stone/40 p-6">
                  <p className="text-sm text-cream-dim mb-2">{contactPage.formNote}</p>
                  <Link
                    href={contactPage.bookingLink}
                    className="text-xs tracking-[0.2em] text-accent uppercase link-underline"
                  >
                    Go to booking form →
                  </Link>
                </div>

                {contactPage.calendarUrl && (
                  <div className="border border-stone/40 p-6">
                    <p className="label-caps mb-2">Schedule a Call</p>
                    <a
                      href={contactPage.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent link-underline"
                    >
                      Book a time →
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <p className="label-caps mb-6">Send a Message</p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <FAQ items={faqItems} />
    </>
  );
}
