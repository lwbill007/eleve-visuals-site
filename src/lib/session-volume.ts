import { parseJsonArray } from "./utils";
import { parseApplicationSettings } from "./session-application";
import type { SessionTimelineStep, SessionVolumeDTO, SessionVolumeStatus } from "./types";

export const SESSION_STATUS_LABELS: Record<SessionVolumeStatus, string> = {
  draft: "Draft",
  coming_soon: "Coming Soon",
  applications_open: "Applications Open",
  applications_closed: "Applications Closed",
  sold_out: "Sold Out",
  completed: "Completed",
  archived: "Archived",
};

export function isSessionVolumeStatus(value: string): value is SessionVolumeStatus {
  return value in SESSION_STATUS_LABELS;
}

export function getSessionStatusLabel(status: SessionVolumeStatus): string {
  return SESSION_STATUS_LABELS[status];
}

export function isApplicationsOpen(volume: Pick<SessionVolumeDTO, "status" | "published" | "showApplyButton">): boolean {
  return (
    volume.published &&
    volume.status === "applications_open" &&
    volume.showApplyButton
  );
}

export function isPublicSessionVolume(volume: Pick<SessionVolumeDTO, "status" | "published">): boolean {
  return volume.published && volume.status !== "draft";
}

export function getSessionCtaMessage(status: SessionVolumeStatus): string {
  switch (status) {
    case "coming_soon":
      return "Coming Soon";
    case "applications_open":
      return "Applications Open";
    case "applications_closed":
      return "Applications Closed";
    case "sold_out":
      return "Sold Out";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return "Unavailable";
  }
}

function parseTimeline(raw: string): SessionTimelineStep[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        label: String((item as SessionTimelineStep).label || ""),
        detail: (item as SessionTimelineStep).detail
          ? String((item as SessionTimelineStep).detail)
          : undefined,
      }))
      .filter((item) => item.label.length > 0);
  } catch {
    return [];
  }
}

export function mapSessionVolume(item: {
  id: string;
  volumeNumber: number;
  title: string;
  slug: string;
  theme: string;
  subtitle: string;
  synopsis: string;
  posterImage: string | null;
  posterImageAlt: string;
  bannerImage: string | null;
  bannerImageAlt: string;
  moodBoard: string;
  gallery: string;
  btsGallery?: string;
  videos?: string;
  status: string;
  genre: string;
  year: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  city: string;
  capacity: string;
  category: string;
  creativeDirector: string;
  directorsNote?: string;
  galleryDelivery?: string;
  dressCode: string;
  runtime: string;
  requirements: string;
  timeline: string;
  applicationDeadline: Date | null;
  teaserVideoUrl: string | null;
  playlistUrl?: string | null;
  featured: boolean;
  published: boolean;
  showApplyButton: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  applicationSettings: string;
}): SessionVolumeDTO {
  const status = isSessionVolumeStatus(item.status) ? item.status : "draft";

  return {
    id: item.id,
    volumeNumber: item.volumeNumber,
    title: item.title,
    slug: item.slug,
    theme: item.theme,
    subtitle: item.subtitle,
    synopsis: item.synopsis,
    posterImage: item.posterImage,
    posterImageAlt: item.posterImageAlt,
    bannerImage: item.bannerImage,
    bannerImageAlt: item.bannerImageAlt,
    moodBoard: parseJsonArray(item.moodBoard),
    gallery: parseJsonArray(item.gallery),
    btsGallery: parseJsonArray(item.btsGallery ?? "[]"),
    videos: parseJsonArray(item.videos ?? "[]"),
    status,
    genre: item.genre,
    year: item.year || String(new Date().getFullYear()),
    sessionDate: item.sessionDate,
    sessionTime: item.sessionTime,
    location: item.location,
    city: item.city,
    capacity: item.capacity,
    category: item.category,
    creativeDirector: item.creativeDirector,
    directorsNote: item.directorsNote ?? "",
    galleryDelivery: item.galleryDelivery ?? "",
    dressCode: item.dressCode,
    runtime: item.runtime,
    requirements: parseJsonArray(item.requirements),
    timeline: parseTimeline(item.timeline),
    applicationDeadline: item.applicationDeadline?.toISOString() ?? null,
    teaserVideoUrl: item.teaserVideoUrl,
    playlistUrl: item.playlistUrl ?? null,
    featured: item.featured,
    published: item.published,
    showApplyButton: item.showApplyButton,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    sortOrder: item.sortOrder,
    applicationSettings: parseApplicationSettings(item.applicationSettings),
  };
}

export function slugifySessionTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveSessionPosterImage(volume: Pick<SessionVolumeDTO, "posterImage" | "bannerImage" | "moodBoard">): string | null {
  return volume.posterImage || volume.bannerImage || volume.moodBoard[0] || null;
}
