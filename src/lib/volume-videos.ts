import { prisma } from "@/lib/db";
import { isVideoUrl } from "@/lib/image-url";
import { toVideoEmbed } from "@/lib/video-embed";
import type { SessionVolumeDTO } from "@/lib/types";

export type VolumeVideoSource = "videos" | "interviews" | "teaser";

export interface VolumeVideoSourceLists {
  videos: string[];
  interviews: string[];
  teaserVideoUrl: string | null;
}

export interface VolumeVideoRow {
  url: string;
  mediaId: string | null;
  title: string;
  source: VolumeVideoSource;
  uploadedAt: string | null;
  isDirectFile: boolean;
}

/** Direct file uploads suitable for a cinematic hero (not YouTube/Vimeo embeds). */
export function isDirectVideoFile(url: string): boolean {
  return isVideoUrl(url) && !toVideoEmbed(url);
}

export function filenameFromVideoUrl(url: string): string {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return decodeURIComponent(path.split("/").pop() || "Video");
  } catch {
    return "Video";
  }
}

export function collectVolumeVideoSources(volume: VolumeVideoSourceLists): VolumeVideoRow[] {
  const rows: VolumeVideoRow[] = [];
  const seen = new Set<string>();

  function add(url: string | null | undefined, source: VolumeVideoSource) {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    rows.push({
      url: trimmed,
      mediaId: null,
      title: filenameFromVideoUrl(trimmed),
      source,
      uploadedAt: null,
      isDirectFile: isDirectVideoFile(trimmed),
    });
  }

  for (const url of volume.videos) add(url, "videos");
  for (const url of volume.interviews) add(url, "interviews");
  add(volume.teaserVideoUrl, "teaser");

  return rows;
}

export function volumeListsIncludeUrl(lists: VolumeVideoSourceLists, url: string): boolean {
  const trimmed = url.trim();
  return (
    lists.videos.includes(trimmed) ||
    lists.interviews.includes(trimmed) ||
    lists.teaserVideoUrl?.trim() === trimmed
  );
}

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
