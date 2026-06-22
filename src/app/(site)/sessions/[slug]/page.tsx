import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionVolumeBySlug } from "@/lib/session-volumes";
import { getSessionsApplicationContent } from "@/lib/content";
import { SessionDetailView } from "@/components/sessions/SessionDetailView";

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

  return <SessionDetailView volume={volume} applicationContent={applicationContent} />;
}
