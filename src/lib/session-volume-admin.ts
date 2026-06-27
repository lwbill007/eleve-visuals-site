import type { SessionTimelineStep, SessionVolumeStatus } from "@/lib/types";
import { SESSION_VOLUME_STATUSES } from "@/lib/types";
import { normalizePortfolioGallery } from "@/lib/portfolio-utils";
import { DEFAULT_SESSION_APPLICATION_SETTINGS } from "@/lib/session-application";

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
    requirements: JSON.stringify(
      Array.isArray(body.requirements)
        ? body.requirements.filter((r) => typeof r === "string" && r.trim())
        : []
    ),
    timeline: JSON.stringify(timeline),
    applicationDeadline,
    teaserVideoUrl: body.teaserVideoUrl ? String(body.teaserVideoUrl) : null,
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
