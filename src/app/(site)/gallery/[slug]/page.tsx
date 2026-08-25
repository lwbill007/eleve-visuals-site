import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isGalleryLive } from "@/lib/gallery/access";
import { findGalleryBySlug, loadClientGallery, recordGalleryEvent } from "@/lib/gallery/service";
import GalleryAccessGate from "@/components/client-gallery/GalleryAccessGate";
import ClientGalleryView from "@/components/client-gallery/ClientGalleryView";

/**
 * Private by construction. No client's name, session type or photograph is ever
 * exposed to a crawler or a link preview — the title is deliberately generic and
 * the page is noindex/nofollow regardless of gallery state (brief §34).
 */
export const metadata: Metadata = {
  title: "Private Gallery — ÉLEVÉ",
  description: "",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Signed URLs are per-request and short-lived, so this page can never be cached.
export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await findGalleryBySlug(slug);

  // A draft, expired or archived gallery is a 404, not an explanation. The only
  // person who should know the difference is the photographer.
  if (!gallery || !isGalleryLive(gallery)) notFound();

  const data = await loadClientGallery(gallery.id);
  if (!data) {
    return (
      <GalleryAccessGate
        slug={slug}
        title={gallery.title}
        clientName={gallery.clientName}
      />
    );
  }

  recordGalleryEvent({ galleryId: gallery.id, type: "gallery_opened" });
  return <ClientGalleryView gallery={data} slug={slug} />;
}
