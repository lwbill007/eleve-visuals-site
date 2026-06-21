import type { Metadata } from "next";
import { PageHero } from "@/components/ui/Section";
import { SessionsApplicationForm } from "@/components/forms/SessionsApplicationForm";
import { getSessionsApplicationContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Apply — ÉLEVÉ Sessions",
  description:
    "Apply to participate in ÉLEVÉ Sessions — an exclusive creative series by ÉLEVÉ Visuals.",
};

export default async function SessionsApplyPage() {
  const applicationContent = await getSessionsApplicationContent();

  return (
    <>
      <PageHero
        eyebrow="Application"
        headline={applicationContent.headline}
        subheadline={applicationContent.subheadline}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <SessionsApplicationForm applicationContent={applicationContent} />
        </div>
      </section>
    </>
  );
}
