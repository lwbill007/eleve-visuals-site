import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/Section";
import { getSiteConfig } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

const LAST_UPDATED = "November 22, 2026";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Privacy Policy",
    description:
      "How ÉLEVÉ Visuals collects, uses, and protects the information you share through this website.",
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const site = await getSiteConfig();
  const contactEmail = site.email?.trim();

  const sections: { title: string; body: React.ReactNode }[] = [
    {
      title: "Who we are",
      body: (
        <>
          ÉLEVÉ Visuals is a photography and film studio founded by {site.creator}, based in
          Sacramento and the Bay Area, California. This policy explains what information this
          website collects, why, and the choices you have.
        </>
      ),
    },
    {
      title: "Information you give us",
      body: (
        <>
          When you submit a booking request, contact message, or ÉLEVÉ Sessions application, we
          collect what you enter: for example your name, email address, phone number, city,
          business or brand name, project details, budget and timeline, social or portfolio
          links, and your answers to the form&apos;s questions. Sessions applications may also
          include portfolio images you upload and an emergency contact. Please only share an
          emergency contact&apos;s details with their permission.
        </>
      ),
    },
    {
      title: "Information collected automatically",
      body: (
        <>
          When you submit a form, our server records your IP address and browser type to help
          prevent spam and abuse. We also use Google Analytics to understand how visitors use the
          site (pages viewed, approximate location, device and browser type, and how you arrived).
          Google Analytics uses cookies to do this. We do not use advertising cookies or sell
          your information.
        </>
      ),
    },
    {
      title: "How we use your information",
      body: (
        <>
          To respond to your inquiry, prepare quotes and bookings, review Sessions applications,
          deliver your images and project files, send related emails (such as confirmations and
          replies), keep our records, protect the site from spam, and improve the website. We
          may use AI-assisted tools inside our private admin to help summarize inquiries and
          draft replies; a person at ÉLEVÉ reviews every decision and message.
        </>
      ),
    },
    {
      title: "Who we share it with",
      body: (
        <>
          We do not sell or rent your personal information, and we do not share it for
          cross-context behavioral advertising. We share it only with service providers that
          help run this website and our business, under their own privacy and security terms:
          website hosting and file storage (Vercel), our database provider, email delivery
          (Resend), email forwarding and DNS (Cloudflare), website analytics (Google
          Analytics), and an AI model provider used for the admin tools described above. We may
          also disclose information if required by law.
        </>
      ),
    },
    {
      title: "Photos and image use",
      body: (
        <>
          Submitting a form or application does not give ÉLEVÉ permission to publish your
          likeness. How images from a shoot may be used (portfolio, website, social media, or
          commercial promotion) is agreed separately, in writing, before or at the session. See
          our{" "}
          <Link href="/booking-terms" className="text-accent underline underline-offset-2">
            Booking Terms
          </Link>
          .
        </>
      ),
    },
    {
      title: "How long we keep it",
      body: (
        <>
          We keep inquiry, booking and application records for as long as needed to respond,
          deliver work, and meet legal, tax and accounting obligations. You can ask us to delete
          your information at any time, subject to those obligations.
        </>
      ),
    },
    {
      title: "Your choices and rights",
      body: (
        <>
          You can ask to access, correct, or delete the personal information we hold about you.
          California residents have rights under the California Consumer Privacy Act (as amended
          by the CPRA), including the right to know, delete, and correct personal information,
          and the right not to be discriminated against for exercising these rights. You can
          block or delete cookies in your browser settings, or install Google&apos;s Analytics
          opt-out browser add-on.
        </>
      ),
    },
    {
      title: "Security",
      body: (
        <>
          We use reputable hosting providers, encrypted connections (HTTPS), and access-controlled
          admin tools. No method of storage or transmission is completely secure, so please
          don&apos;t send sensitive information such as government ID or payment card numbers
          through our forms.
        </>
      ),
    },
    {
      title: "Children",
      body: (
        <>
          This website is not directed to children under 13, and we do not knowingly collect
          their personal information. Sessions involving minors require a parent or guardian.
        </>
      ),
    },
    {
      title: "Changes and contact",
      body: (
        <>
          We may update this policy; the date below shows the latest version. Questions or
          requests:{" "}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="text-accent underline underline-offset-2"
            >
              {contactEmail}
            </a>
          ) : (
            <Link href="/contact" className="text-accent underline underline-offset-2">
              our contact page
            </Link>
          )}
          .
        </>
      ),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Legal"
        headline="Privacy Policy"
        subheadline="What we collect through this website, why, and the choices you have."
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-narrow space-y-10">
          {sections.map((section) => (
            <article key={section.title} className="border-t border-stone/30 pt-8">
              <h2 className="headline-sm mb-4">{section.title}</h2>
              <p className="body-md">{section.body}</p>
            </article>
          ))}

          <p className="border-t border-stone/30 pt-8 text-sm text-muted">
            Last updated {LAST_UPDATED}.
          </p>
        </div>
      </section>
    </>
  );
}
