import type { Metadata } from "next";
import {
  getAllSessionVolumes,
  getFeaturedSessionVolume,
  getHeroPosterFromVolumes,
} from "@/lib/session-volumes";
import { SessionsCollectionHero } from "@/components/sessions/SessionsCollectionHero";
import { FeaturedSession } from "@/components/sessions/FeaturedSession";
import { SessionsVolumeGrid } from "@/components/sessions/SessionsVolumeGrid";
import { CTABanner } from "@/components/ui/Section";
import { getPageCopy } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ÉLEVÉ Sessions",
  description:
    "Limited creative productions where photographers, models, stylists, and artists collaborate to create unforgettable visual stories.",
};

export default async function SessionsPage() {
  const [volumes, featured, pageCopy] = await Promise.all([
    getAllSessionVolumes(),
    getFeaturedSessionVolume(),
    getPageCopy(),
  ]);

  const { poster, alt } = getHeroPosterFromVolumes(volumes);
  const hasArchive = volumes.some((v) => v.status === "archived");

  return (
    <>
      <SessionsCollectionHero featuredPoster={poster} featuredAlt={alt} />
      {featured && <FeaturedSession volume={featured} />}
      <SessionsVolumeGrid volumes={volumes} />
      {hasArchive && <SessionsVolumeGrid volumes={volumes} showArchive />}
      <CTABanner
        headline={pageCopy.sessionsCta.headline}
        subheadline={pageCopy.sessionsCta.subheadline}
        primaryLabel={pageCopy.sessionsCta.primaryLabel}
        primaryHref={pageCopy.sessionsCta.primaryHref}
      />
    </>
  );
}
