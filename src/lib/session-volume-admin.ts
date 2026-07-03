import type { SessionTimelineStep, SessionVolumeStatus } from "@/lib/types";
import { SESSION_VOLUME_STATUSES } from "@/lib/types";
import { normalizePortfolioGallery } from "@/lib/portfolio-utils";
import { DEFAULT_SESSION_APPLICATION_SETTINGS } from "@/lib/session-application";

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

function objectList<T extends Record<string, string>>(value: unknown, keys: (keyof T)[], required: (keyof T)[]): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const out = {} as T;
      for (const key of keys) {
        out[key] = String((item as Record<string, unknown>)[key as string] ?? "") as T[keyof T];
      }
      return out;
    })
    .filter((item) => required.every((key) => String(item[key]).trim().length > 0));
}

export function parseSessionVolumeBody(body: Record<string, unknown>) {
  const status = SESSION_VOLUME_STATUSES.includes(body.status as SessionVolumeStatus)
    ? (body.status as SessionVolumeStatus)
    : "draft";

  const timeline = Array.isArray(body.timeline)
    ? (body.timeline as SessionTimelineStep[])
        .filter((step) => step?.label)
        .map((step) => ({
          label: String(step.label),
          detail: step.detail ? String(step.detail) : undefined,
        }))
    : [];

  const applicationDeadline =
    typeof body.applicationDeadline === "string" && body.applicationDeadline
      ? new Date(body.applicationDeadline)
      : body.applicationDeadline === null
        ? null
        : undefined;

  return {
    volumeNumber: Number(body.volumeNumber) || 1,
    title: String(body.title || ""),
    slug: String(body.slug || ""),
    theme: String(body.theme || ""),
    subtitle: String(body.subtitle || ""),
    synopsis: String(body.synopsis || ""),
    posterImage: (body.posterImage as string | null) ?? null,
    posterImageAlt: String(body.posterImageAlt || ""),
    bannerImage: (body.bannerImage as string | null) ?? null,
    bannerImageAlt: String(body.bannerImageAlt || ""),
    moodBoard: JSON.stringify(normalizePortfolioGallery(body.moodBoard)),
    gallery: JSON.stringify(normalizePortfolioGallery(body.gallery)),
    btsGallery: JSON.stringify(normalizePortfolioGallery(body.btsGallery)),
    videos: JSON.stringify(
      Array.isArray(body.videos)
        ? body.videos.filter((v) => typeof v === "string" && v.trim())
        : []
    ),
    status,
    genre: String(body.genre || ""),
    year: String(body.year || new Date().getFullYear()),
    sessionDate: String(body.sessionDate || ""),
    sessionTime: String(body.sessionTime || ""),
    location: String(body.location || ""),
    city: String(body.city || ""),
    capacity: String(body.capacity || ""),
    category: String(body.category || ""),
    creativeDirector: String(body.creativeDirector || ""),
    directorsNote: String(body.directorsNote || ""),
    galleryDelivery: String(body.galleryDelivery || ""),
    dressCode: String(body.dressCode || ""),
    runtime: String(body.runtime || ""),
    mood: String(body.mood || ""),
    season: String(body.season || ""),
    difficulty: String(body.difficulty || ""),
    colorPalette: JSON.stringify(stringList(body.colorPalette)),
    inspirations: JSON.stringify(stringList(body.inspirations)),
    testimonials: JSON.stringify(
      objectList<{ quote: string; name: string; role: string }>(
        body.testimonials,
        ["quote", "name", "role"],
        ["quote"]
      )
    ),
    requirements: JSON.stringify(
      Array.isArray(body.requirements)
        ? body.requirements.filter((r) => typeof r === "string" && r.trim())
        : []
    ),
    timeline: JSON.stringify(timeline),
    applicationDeadline,
    teaserVideoUrl: body.teaserVideoUrl ? String(body.teaserVideoUrl) : null,
    featuredMediaId: body.featuredMediaId ? String(body.featuredMediaId) : null,
    playlistUrl: body.playlistUrl ? String(body.playlistUrl) : null,
    interviews: JSON.stringify(stringList(body.interviews)),
    audio: JSON.stringify(stringList(body.audio)),
    productionNotes: String(body.productionNotes || ""),
    callSheet: body.callSheet ? String(body.callSheet) : null,
    creativeBrief: String(body.creativeBrief || ""),
    wardrobeGuide: body.wardrobeGuide ? String(body.wardrobeGuide) : null,
    sponsors: JSON.stringify(
      objectList<{ name: string; logo: string; url: string }>(
        body.sponsors,
        ["name", "logo", "url"],
        []
      ).filter((s) => s.name || s.logo)
    ),
    resources: JSON.stringify(
      objectList<{ label: string; url: string }>(body.resources, ["label", "url"], ["label", "url"])
    ),
    faqs: JSON.stringify(
      objectList<{ question: string; answer: string }>(
        body.faqs,
        ["question", "answer"],
        ["question", "answer"]
      )
    ),
    featured: !!body.featured,
    published: !!body.published,
    showApplyButton: body.showApplyButton !== false,
    archived: !!body.archived || status === "archived",
    seoTitle: String(body.seoTitle || ""),
    seoDescription: String(body.seoDescription || ""),
    sortOrder: Number(body.sortOrder) || 0,
    applicationSettings: JSON.stringify(
      body.applicationSettings ?? DEFAULT_SESSION_APPLICATION_SETTINGS
    ),
  };
}
