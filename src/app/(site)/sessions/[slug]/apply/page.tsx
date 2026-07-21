import { notFound, redirect } from "next/navigation";
import { getSessionVolumeBySlug } from "@/lib/session-volumes";
import { getSessionsApplicationContent } from "@/lib/content";
import { isApplicationsOpen } from "@/lib/session-volume";
import { validateSessionApplicationGate, getSessionVolumeForApplication } from "@/lib/session-application-server";
import { SessionApplicationHero } from "@/components/sessions/application/SessionApplicationHero";
import { SessionApplicationWizard } from "@/components/sessions/application/SessionApplicationWizard";
import { createSessionUploadToken } from "@/lib/session-upload-token";
import type { Metadata } from "next";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Session Application",
  robots: { index: false, follow: true },
};

export default async function SessionApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const volume = await getSessionVolumeBySlug(slug);
  if (!volume) notFound();

  const dbVolume = await getSessionVolumeForApplication(volume.id);
  if (!dbVolume) notFound();

  const gate = await validateSessionApplicationGate(dbVolume);
  if (!isApplicationsOpen(volume) || !gate.ok) {
    redirect(`/sessions/${slug}`);
  }

  const applicationContent = await getSessionsApplicationContent();
  const uploadToken = await createSessionUploadToken(volume.id);

  return (
    <>
      <SessionApplicationHero volume={volume} />
      <section className="section-padding bg-ink">
        <div className="container-narrow">
          <SessionApplicationWizard
            volume={volume}
            settings={volume.applicationSettings}
            applicationContent={applicationContent}
            uploadToken={uploadToken}
          />
        </div>
      </section>
    </>
  );
}
