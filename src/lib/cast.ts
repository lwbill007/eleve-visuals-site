import { parseJsonArray } from "./utils";
import {
  CAST_ROLES,
  CAST_STATUSES,
  type CastAward,
  type CastMemberDTO,
  type CastRole,
  type CastStatus,
} from "./types";

export const CAST_ROLE_LABELS: Record<CastRole, string> = {
  director: "Director",
  creative_director: "Creative Director",
  photographer: "Photographer",
  videographer: "Videographer",
  model: "Model",
  stylist: "Stylist",
  makeup_artist: "Makeup Artist",
  hair_stylist: "Hair Stylist",
  designer: "Designer",
  assistant: "Assistant",
  other: "Other",
};

/** Section headings for the movie-style end credits, in display order. */
export const CAST_CREDIT_HEADINGS: Record<CastRole, string> = {
  director: "Direction",
  creative_director: "Creative Direction",
  photographer: "Photography",
  videographer: "Videography",
  model: "Cast",
  stylist: "Styling",
  makeup_artist: "Makeup",
  hair_stylist: "Hair",
  designer: "Design",
  assistant: "Production Assistance",
  other: "Additional Crew",
};

export const CAST_STATUS_LABELS: Record<CastStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  alumni: "Alumni",
};

export function isCastRole(value: string): value is CastRole {
  return (CAST_ROLES as readonly string[]).includes(value);
}

export function isCastStatus(value: string): value is CastStatus {
  return (CAST_STATUSES as readonly string[]).includes(value);
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAwards(raw: string): CastAward[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a === "object")
      .map((a) => ({
        name: String((a as CastAward).name || ""),
        year: String((a as CastAward).year || ""),
        category: String((a as CastAward).category || ""),
        icon: String((a as CastAward).icon || "award"),
        reason: String((a as CastAward).reason || ""),
        volume: String((a as CastAward).volume || ""),
      }))
      .filter((a) => a.name);
  } catch {
    return [];
  }
}

export function mapCastMember(item: {
  id: string;
  volumeId: string;
  fullName: string;
  stageName: string;
  slug: string;
  role: string;
  profilePhoto: string | null;
  additionalPhotos: string;
  bio: string;
  instagram: string;
  tiktok: string;
  website: string;
  portfolioLink: string;
  city: string;
  status: string;
  featured: boolean;
  isAlumni: boolean;
  featuredAlumni: boolean;
  notes: string;
  futureCollaborations: string;
  enableProfile: boolean;
  awards: string;
  sortOrder: number;
}): CastMemberDTO {
  return {
    id: item.id,
    volumeId: item.volumeId,
    fullName: item.fullName,
    stageName: item.stageName,
    slug: item.slug || slugifyName(item.fullName),
    role: isCastRole(item.role) ? item.role : "other",
    profilePhoto: item.profilePhoto,
    additionalPhotos: parseJsonArray(item.additionalPhotos),
    bio: item.bio,
    instagram: item.instagram,
    tiktok: item.tiktok,
    website: item.website,
    portfolioLink: item.portfolioLink,
    city: item.city,
    status: isCastStatus(item.status) ? item.status : "confirmed",
    featured: item.featured,
    isAlumni: item.isAlumni,
    featuredAlumni: item.featuredAlumni,
    notes: item.notes,
    futureCollaborations: item.futureCollaborations,
    enableProfile: item.enableProfile,
    awards: parseAwards(item.awards),
    sortOrder: item.sortOrder,
  };
}

/** Normalize an admin payload into Prisma-writable fields. */
export function parseCastBody(body: Record<string, unknown>) {
  const fullName = String(body.fullName || "").trim();
  const role = isCastRole(String(body.role)) ? String(body.role) : "model";
  const status = isCastStatus(String(body.status)) ? String(body.status) : "confirmed";

  const additionalPhotos = Array.isArray(body.additionalPhotos)
    ? body.additionalPhotos.filter((p) => typeof p === "string" && p.trim())
    : [];

  const awards = Array.isArray(body.awards)
    ? (body.awards as Record<string, unknown>[])
        .filter((a) => a && typeof a === "object" && String(a.name || "").trim())
        .map((a) => ({
          name: String(a.name || ""),
          year: String(a.year || ""),
          category: String(a.category || ""),
          icon: String(a.icon || "award"),
          reason: String(a.reason || ""),
          volume: String(a.volume || ""),
        }))
    : [];

  const isAlumni = !!body.isAlumni || status === "alumni";
  const slugInput = String(body.slug || "").trim();

  return {
    fullName,
    stageName: String(body.stageName || ""),
    slug: slugInput ? slugifyName(slugInput) : slugifyName(fullName),
    role,
    profilePhoto: (body.profilePhoto as string | null) ?? null,
    additionalPhotos: JSON.stringify(additionalPhotos),
    bio: String(body.bio || ""),
    instagram: String(body.instagram || ""),
    tiktok: String(body.tiktok || ""),
    website: String(body.website || ""),
    portfolioLink: String(body.portfolioLink || ""),
    city: String(body.city || ""),
    status,
    featured: !!body.featured,
    isAlumni,
    featuredAlumni: !!body.featuredAlumni,
    notes: String(body.notes || ""),
    futureCollaborations: String(body.futureCollaborations || ""),
    enableProfile: !!body.enableProfile,
    awards: JSON.stringify(awards),
    sortOrder: Number(body.sortOrder) || 0,
  };
}

export function castDisplayName(member: Pick<CastMemberDTO, "fullName" | "stageName">): string {
  return member.stageName || member.fullName;
}
