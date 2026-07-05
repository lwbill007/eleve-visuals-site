import { isVideoUrl } from "@/lib/image-url";
import { toVideoEmbed } from "@/lib/video-embed";

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
