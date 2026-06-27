import type { Metadata } from "next";
import {
  getAllSessionVolumes,
  getFeaturedSessionVolume,
  getHeroPosterFromVolumes,
} from "@/lib/session-volumes";
import { countAcceptedApplications, isSessionApplyOpen } from "@/lib/session-application-server";
import { toVideoEmbed } from "@/lib/video-embed";
import { SessionsCollectionHero } from "@/components/sessions/SessionsCollectionHero";
import { FeaturedVolumeShowcase } from "@/components/sessions/FeaturedVolumeShowcase";
import { SessionBenefits } from "@/components/sessions/SessionBenefits";
import { SessionsProcessTimeline } from "@/components/sessions/SessionsProcessTimeline";
import { WhySessions } from "@/components/sessions/WhySessions";
import { SessionsBehindTheScenes } from "@/components/sessions/SessionsBehindTheScenes";
import { VolumeArchive } from "@/components/sessions/VolumeArchive";
import { SessionsFutureSections } from "@/components/sessions/SessionsFutureSections";
import type { LightboxItem } from "@/components/sessions/MediaLightbox";
import { FAQ } from "@/components/sections/FAQ";
import { SESSIONS_FAQ } from "@/components/sessions/sessionsFaqData";
import { CTABanner } from "@/components/ui/Section";
import { getPageCopy } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ÉLEVÉ Sessions",
  description:
    "Limited creative productions where photographers, models, stylists, and artists collaborate to create unforgettable visual stories.",
};

const BTS_LIMIT = 12;

export default async function SessionsPage() {
  const [volumes, featured, pageCopy] = await Promise.all([
    getAllSessionVolumes(),
    getFeaturedSessionVolume(),
    getPageCopy(),
  ]);

  const { poster, alt } = getHeroPosterFromVolumes(volumes);

  let featuredCanApply = false;
  let spotsRemaining: number | null = null;
  if (featured) {
    featuredCanApply = isSessionApplyOpen(featured);
    const maxCapacity = featured.applicationSettings.maxCapacity;
    if (maxCapacity != null) {
      const accepted = await countAcceptedApplications(featured.id);
      spotsRemaining = Math.max(0, maxCapacity - accepted);
    }
  }

  const btsItems: LightboxItem[] = [];
  for (const v of volumes) {
    for (const src of v.btsGallery) {
      btsItems.push({ type: "image", src, alt: `${v.title} — behind the scenes` });
    }
    for (const src of v.videos) {
      btsItems.push({ type: "video", src, embed: toVideoEmbed(src), alt: `${v.title} — video` });
    }
  }
  const behindTheScenes = btsItems.slice(0, BTS_LIMIT);

  return (
    <>
      <SessionsCollectionHero featuredPoster={poster} featuredAlt={alt} />
      {featured && (
        <FeaturedVolumeShowcase
          volume={featured}
          canApply={featuredCanApply}
          spotsRemaining={spotsRemaining}
        />
      )}
      <SessionBenefits />
      <SessionsProcessTimeline />
      <WhySessions />
      <SessionsBehindTheScenes items={behindTheScenes} />
      <VolumeArchive volumes={volumes} excludeId={featured?.id} />
      <FAQ items={SESSIONS_FAQ} />
      <SessionsFutureSections />
      <CTABanner
        headline={pageCopy.sessionsCta.headline}
        subheadline={pageCopy.sessionsCta.subheadline}
        primaryLabel={pageCopy.sessionsCta.primaryLabel}
        primaryHref={pageCopy.sessionsCta.primaryHref}
      />
    </>
  );
}
