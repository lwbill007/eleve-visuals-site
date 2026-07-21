import type { Metadata } from "next";
import {
  getAllSessionVolumes,
  getFeaturedSessionVolume,
  getHeroPosterFromVolumes,
} from "@/lib/session-volumes";
import {
  countAcceptedApplicationsByVolume,
  isSessionApplyOpen,
} from "@/lib/session-application-server";
import { getFeaturedAlumni } from "@/lib/cast-server";
import { toVideoEmbed } from "@/lib/video-embed";
import { CREATIVE_DISCIPLINES } from "@/lib/sessions-experience";
import { getPageCopy } from "@/lib/content";
import { SessionsCinematicHero } from "@/components/sessions/SessionsCinematicHero";
import { VolumeBrowser } from "@/components/sessions/VolumeBrowser";
import { FeaturedSpotlight } from "@/components/sessions/FeaturedSpotlight";
import { ProductionTimeline } from "@/components/sessions/ProductionTimeline";
import { WhyJoin } from "@/components/sessions/WhyJoin";
import { SessionsSocialProof, type ProofStat } from "@/components/sessions/SessionsSocialProof";
import { SessionsAwards } from "@/components/sessions/SessionsAwards";
import { SessionsCommunity } from "@/components/sessions/SessionsCommunity";
import { CinematicGallery } from "@/components/sessions/CinematicGallery";
import { SessionsFinalCTA } from "@/components/sessions/SessionsFinalCTA";
import { ApplyDock } from "@/components/sessions/ApplyDock";
import type { LightboxItem } from "@/components/sessions/MediaLightbox";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import("@/lib/seo/page-metadata");
  return buildPageMetadata({
    title: "ÉLEVÉ Sessions",
    description:
      "An ongoing series of cinematic creative productions. Photographers, models, stylists, and artists are cast into limited Volumes — apply to be part of the next one.",
    path: "/sessions",
  });
}

const GALLERY_LIMIT = 16;

export default async function SessionsPage() {
  const [volumes, featured, pageCopy, alumni] = await Promise.all([
    getAllSessionVolumes(),
    getFeaturedSessionVolume(),
    getPageCopy(),
    getFeaturedAlumni().catch(() => []),
  ]);

  const { poster, alt } = getHeroPosterFromVolumes(volumes);
  const acceptedByVolume = await countAcceptedApplicationsByVolume(volumes.map((v) => v.id));

  let featuredCanApply = false;
  let spotsRemaining: number | null = null;
  if (featured) {
    featuredCanApply = isSessionApplyOpen(featured);
    const maxCapacity = featured.applicationSettings.maxCapacity;
    if (maxCapacity != null) {
      const accepted = acceptedByVolume.get(featured.id) ?? 0;
      spotsRemaining = Math.max(0, maxCapacity - accepted);
    }
  }

  // Real, honest social proof derived from published data.
  const creativesCast = [...acceptedByVolume.values()].reduce((sum, n) => sum + n, 0);
  const publishedImages = volumes.reduce(
    (sum, v) => sum + v.gallery.length + v.btsGallery.length,
    0
  );

  const stats: ProofStat[] = [
    { value: `${volumes.length}`, label: "Volumes" },
    ...(creativesCast > 0 ? [{ value: `${creativesCast}`, label: "Creatives Cast" }] : []),
    ...(publishedImages > 0 ? [{ value: `${publishedImages}`, label: "Published Images" }] : []),
    { value: `${CREATIVE_DISCIPLINES.length}`, label: "Roles Welcomed" },
  ];

  // Aggregate frames across the archive for the cinematic gallery.
  const galleryItems: LightboxItem[] = [];
  for (const v of volumes) {
    for (const src of v.gallery) galleryItems.push({ type: "image", src, alt: `${v.title} — ${v.theme}` });
    for (const src of v.btsGallery) galleryItems.push({ type: "image", src, alt: `${v.title} — behind the scenes` });
    for (const src of v.videos) galleryItems.push({ type: "video", src, embed: toVideoEmbed(src), alt: `${v.title} — video` });
  }
  const gallery = galleryItems.slice(0, GALLERY_LIMIT);

  return (
    <>
      <SessionsCinematicHero
        volume={featured}
        canApply={featuredCanApply}
        fallbackPoster={poster}
        fallbackAlt={alt}
      />

      <VolumeBrowser volumes={volumes} />

      {featured && (
        <FeaturedSpotlight volume={featured} canApply={featuredCanApply} spotsRemaining={spotsRemaining} />
      )}

      <ProductionTimeline />
      <WhyJoin />
      <SessionsSocialProof stats={stats} />
      <SessionsAwards />
      <SessionsCommunity spotlights={alumni} />
      <CinematicGallery items={gallery} />

      <SessionsFinalCTA
        volume={featured}
        canApply={featuredCanApply}
        fallbackLabel={pageCopy.sessionsCta.primaryLabel}
        fallbackHref={pageCopy.sessionsCta.primaryHref}
      />

      {featured && featuredCanApply && (
        <ApplyDock
          slug={featured.slug}
          volumeNumber={featured.volumeNumber}
          spotsRemaining={spotsRemaining}
        />
      )}
    </>
  );
}
