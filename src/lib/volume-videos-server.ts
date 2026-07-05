import { prisma } from "@/lib/db";
import type { SessionVolumeDTO } from "@/lib/types";
import {
  isDirectVideoFile,
  volumeListsIncludeUrl,
  type VolumeVideoRow,
  type VolumeVideoSourceLists,
} from "./volume-videos";

/** Clear featured reference if the media asset or URL is no longer part of the Volume. */
export async function validateFeaturedMediaId(
  featuredMediaId: string | null | undefined,
  lists: VolumeVideoSourceLists
): Promise<string | null> {
  if (!featuredMediaId) return null;

  const asset = await prisma.mediaAsset.findUnique({ where: { id: featuredMediaId } });
  if (!asset?.url) return null;
  if (!volumeListsIncludeUrl(lists, asset.url)) return null;
  if (!isDirectVideoFile(asset.url)) return null;

  return featuredMediaId;
}

export async function resolveFeaturedVideoUrl(
  volume: Pick<SessionVolumeDTO, "featuredMediaId" | "videos" | "interviews" | "teaserVideoUrl">
): Promise<string | null> {
  if (!volume.featuredMediaId) return null;

  const asset = await prisma.mediaAsset.findUnique({ where: { id: volume.featuredMediaId } });
  if (!asset?.url) return null;

  const lists: VolumeVideoSourceLists = {
    videos: volume.videos,
    interviews: volume.interviews,
    teaserVideoUrl: volume.teaserVideoUrl,
  };

  if (!volumeListsIncludeUrl(lists, asset.url)) return null;
  if (!isDirectVideoFile(asset.url)) return null;

  return asset.url;
}

export async function attachMediaMetadata(rows: VolumeVideoRow[]): Promise<VolumeVideoRow[]> {
  const urls = rows.map((r) => r.url);
  if (urls.length === 0) return rows;

  const assets = await prisma.mediaAsset.findMany({
    where: { url: { in: urls } },
  });
  const byUrl = new Map(assets.map((a) => [a.url, a]));

  return rows.map((row) => {
    const asset = byUrl.get(row.url);
    if (!asset) return row;
    return {
      ...row,
      mediaId: asset.id,
      title: asset.filename?.trim() || row.title,
      uploadedAt: asset.createdAt.toISOString(),
    };
  });
}
