import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionVolumeBySlug, getAllSessionVolumes } from "@/lib/session-volumes";
import { getSessionsApplicationContent } from "@/lib/content";
import {
  validateSessionApplicationGate,
  countAcceptedApplications,
} from "@/lib/session-application-server";
import { getCastForVolume, getCastAppearances } from "@/lib/cast-server";
import { SessionDetailView } from "@/components/sessions/SessionDetailView";
import type { SessionVolumeDTO } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const volume = await getSessionVolumeBySlug(slug);
  if (!volume) return { title: "Session Not Found" };

  return {
    title: volume.seoTitle || `${volume.title} — ÉLEVÉ Sessions Vol. ${volume.volumeNumber}`,
    description:
      volume.seoDescription ||
      volume.subtitle ||
      volume.synopsis.slice(0, 160),
    openGraph: {
      title: volume.title,
      description: volume.subtitle || volume.theme,
      images: volume.posterImage ? [{ url: volume.posterImage }] : undefined,
    },
  };
}

export default async function SessionVolumePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [volume, applicationContent] = await Promise.all([
    getSessionVolumeBySlug(slug),
    getSessionsApplicationContent(),
  ]);

  if (!volume) notFound();

  const [cast, allVolumes, acceptedCount] = await Promise.all([
    getCastForVolume(volume.id),
    getAllSessionVolumes(),
    countAcceptedApplications(volume.id),
  ]);

  const appearances = await getCastAppearances(
    cast.map((m) => m.slug),
    volume.id
  );

  const others = allVolumes.filter((v) => v.id !== volume.id);
  const comingSoon = others.filter((v) => v.status === "coming_soon").slice(0, 8);
  const recommendedPool = others.filter((v) => v.status !== "coming_soon");
  const matches = recommendedPool.filter(
    (v) => v.category === volume.category || (volume.genre && v.genre === volume.genre)
  );
  const seen = new Set<string>();
  const recommended: SessionVolumeDTO[] = [...matches, ...recommendedPool]
    .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    .slice(0, 10);

  const applyGate = await validateSessionApplicationGate({
    id: volume.id,
    status: volume.status,
    published: volume.published,
    showApplyButton: volume.showApplyButton,
    applicationDeadline: volume.applicationDeadline ? new Date(volume.applicationDeadline) : null,
    applicationSettings: JSON.stringify(volume.applicationSettings),
  });

  return (
    <SessionDetailView
      volume={volume}
      applicationContent={applicationContent}
      canApply={applyGate.ok}
      cast={cast}
      appearances={appearances}
      acceptedCount={acceptedCount}
      recommended={recommended}
      comingSoon={comingSoon}
    />
  );
}
