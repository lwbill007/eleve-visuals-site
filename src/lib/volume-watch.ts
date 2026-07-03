import { toVideoEmbed } from "@/lib/video-embed";
import type { SessionVolumeDTO } from "@/lib/types";

export function filenameFromVideoUrl(url: string): string {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return decodeURIComponent(path.split("/").pop() || "Video");
  } catch {
    return "Video";
  }
}

export type WatchRailKind = "featured" | "trailer" | "bts" | "interview";

export interface WatchRailItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  embed: string | null;
  kind: WatchRailKind;
}

export function countVolumeVideos(volume: Pick<SessionVolumeDTO, "videos" | "interviews" | "teaserVideoUrl" | "featuredVideoUrl">): number {
  const urls = new Set<string>();
  if (volume.featuredVideoUrl) urls.add(volume.featuredVideoUrl);
  if (volume.teaserVideoUrl) urls.add(volume.teaserVideoUrl);
  for (const u of volume.videos) urls.add(u);
  for (const u of volume.interviews) urls.add(u);
  return urls.size;
}

export function buildWatchRail(
  volume: Pick<SessionVolumeDTO, "title" | "featuredVideoUrl" | "teaserVideoUrl" | "videos" | "interviews">
): WatchRailItem[] {
  const items: WatchRailItem[] = [];
  const seen = new Set<string>();

  function push(url: string, title: string, subtitle: string, kind: WatchRailKind) {
    if (!url.trim() || seen.has(url)) return;
    seen.add(url);
    items.push({
      id: `${kind}-${url}`,
      title,
      subtitle,
      url,
      embed: toVideoEmbed(url),
      kind,
    });
  }

  if (volume.featuredVideoUrl) {
    push(volume.featuredVideoUrl, "Featured Film", volume.title, "featured");
  }
  if (volume.teaserVideoUrl) {
    push(volume.teaserVideoUrl, "Official Trailer", "Trailer", "trailer");
  }
  for (const url of volume.videos) {
    push(url, filenameFromVideoUrl(url), "Behind the Scenes", "bts");
  }
  for (const url of volume.interviews) {
    push(url, filenameFromVideoUrl(url), "Interview", "interview");
  }

  return items;
}
