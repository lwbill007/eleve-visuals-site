import { parseJsonArray } from "./utils";
import { parseApplicationSettings } from "./session-application";
import type {
  SessionTimelineStep,
  SessionVolumeDTO,
  SessionVolumeStatus,
  VolumeFAQ,
  VolumeResource,
  VolumeSponsor,
  VolumeTestimonial,
} from "./types";

function parseObjectArray<T>(raw: string | undefined, map: (item: Record<string, unknown>) => T | null): T[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => map(item as Record<string, unknown>))
      .filter((item): item is T => item !== null);
  } catch {
    return [];
  }
}

function parseSponsors(raw?: string): VolumeSponsor[] {
  return parseObjectArray(raw, (s) => {
    const name = String(s.name || "");
    const logo = String(s.logo || "");
    if (!name && !logo) return null;
    return { name, logo, url: String(s.url || "") };
  });
}

function parseResources(raw?: string): VolumeResource[] {
  return parseObjectArray(raw, (r) => {
    const label = String(r.label || "");
    const url = String(r.url || "");
    if (!label || !url) return null;
    return { label, url };
  });
}

function parseFaqs(raw?: string): VolumeFAQ[] {
  return parseObjectArray(raw, (f) => {
    const question = String(f.question || "");
    const answer = String(f.answer || "");
    if (!question || !answer) return null;
    return { question, answer };
  });
}

function parseTestimonials(raw?: string): VolumeTestimonial[] {
  return parseObjectArray(raw, (t) => {
    const quote = String(t.quote || "");
    if (!quote) return null;
    return { quote, name: String(t.name || ""), role: String(t.role || "") };
  });
}

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
  mood?: string;
  season?: string;
  difficulty?: string;
  colorPalette?: string;
  inspirations?: string;
  testimonials?: string;
  requirements: string;
  timeline: string;
  applicationDeadline: Date | null;
  teaserVideoUrl: string | null;
  playlistUrl?: string | null;
  interviews?: string;
  audio?: string;
  productionNotes?: string;
  callSheet?: string | null;
  creativeBrief?: string;
  wardrobeGuide?: string | null;
  sponsors?: string;
  resources?: string;
  faqs?: string;
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
    mood: item.mood ?? "",
    season: item.season ?? "",
    difficulty: item.difficulty ?? "",
    colorPalette: parseJsonArray(item.colorPalette ?? "[]"),
    inspirations: parseJsonArray(item.inspirations ?? "[]"),
    testimonials: parseTestimonials(item.testimonials),
    requirements: parseJsonArray(item.requirements),
    timeline: parseTimeline(item.timeline),
    applicationDeadline: item.applicationDeadline?.toISOString() ?? null,
    teaserVideoUrl: item.teaserVideoUrl,
    playlistUrl: item.playlistUrl ?? null,
    interviews: parseJsonArray(item.interviews ?? "[]"),
    audio: parseJsonArray(item.audio ?? "[]"),
    productionNotes: item.productionNotes ?? "",
    callSheet: item.callSheet ?? null,
    creativeBrief: item.creativeBrief ?? "",
    wardrobeGuide: item.wardrobeGuide ?? null,
    sponsors: parseSponsors(item.sponsors),
    resources: parseResources(item.resources),
    faqs: parseFaqs(item.faqs),
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
