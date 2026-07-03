import { prisma } from "./db";
import { mapCastMember, castDisplayName, CAST_ROLE_LABELS } from "./cast";
import type { CastAppearance, CastAward, CastMemberDTO, CastRole } from "./types";

const PUBLIC_STATUSES = ["confirmed", "alumni"];

function dedupeAwards(awards: CastAward[]): CastAward[] {
  const seen = new Set<string>();
  return awards.filter((award) => {
    const key = [award.name, award.year, award.category, award.volume, award.reason]
      .map((v) => v.trim().toLowerCase())
      .join("|");
    if (!award.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Cast shown publicly on a Volume page (hides pending members). */
export async function getCastForVolume(volumeId: string): Promise<CastMemberDTO[]> {
  const rows = await prisma.castMember.findMany({
    where: { volumeId, status: { in: PUBLIC_STATUSES } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapCastMember);
}

/** All cast for a Volume (admin view, includes pending). */
export async function getAllCastForVolume(volumeId: string): Promise<CastMemberDTO[]> {
  const rows = await prisma.castMember.findMany({
    where: { volumeId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapCastMember);
}

/**
 * Map each person slug to the other published Volumes they've appeared in.
 * Powers "Other Volumes they've participated in" on cast profiles — no hardcoding.
 */
export async function getCastAppearances(
  slugs: string[],
  excludeVolumeId: string
): Promise<Record<string, CastAppearance[]>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return {};

  const rows = await prisma.castMember.findMany({
    where: {
      slug: { in: unique },
      volumeId: { not: excludeVolumeId },
      status: { in: PUBLIC_STATUSES },
      volume: { published: true, status: { not: "draft" } },
    },
    include: { volume: { select: { volumeNumber: true, title: true, slug: true } } },
    orderBy: { volume: { volumeNumber: "desc" } },
  });

  const map: Record<string, CastAppearance[]> = {};
  for (const row of rows) {
    const member = mapCastMember(row);
    const entry: CastAppearance = {
      volumeNumber: row.volume.volumeNumber,
      title: row.volume.title,
      slug: row.volume.slug,
      role: member.role,
    };
    (map[member.slug] ??= []).push(entry);
  }
  return map;
}

export interface CastProfileVolume {
  volumeNumber: number;
  title: string;
  slug: string;
  role: CastRole;
  poster: string | null;
}

export interface CastProfile {
  slug: string;
  name: string;
  roles: CastRole[];
  bio: string;
  city: string;
  instagram: string;
  tiktok: string;
  website: string;
  portfolioLink: string;
  photos: string[];
  coverPhoto: string | null;
  awards: CastMemberDTO["awards"];
  futureCollaborations: string;
  isAlumni: boolean;
  volumes: CastProfileVolume[];
}

function firstNonEmpty(values: string[]): string {
  return values.find((v) => v && v.trim().length > 0) ?? "";
}

/** Aggregate a single person across every public Volume by slug. */
export async function getCastProfile(slug: string): Promise<CastProfile | null> {
  const rows = await prisma.castMember.findMany({
    where: {
      slug,
      status: { in: PUBLIC_STATUSES },
      volume: { published: true, status: { not: "draft" } },
    },
    include: {
      volume: { select: { volumeNumber: true, title: true, slug: true, posterImage: true, bannerImage: true } },
    },
    orderBy: [{ featured: "desc" }, { volume: { volumeNumber: "desc" } }],
  });

  if (rows.length === 0) return null;
  if (!rows.some((r) => r.enableProfile)) return null;

  const members = rows.map(mapCastMember);

  const photos = [
    ...members.map((m) => m.profilePhoto).filter((p): p is string => !!p),
    ...members.flatMap((m) => m.additionalPhotos),
  ].filter((p, i, arr) => arr.indexOf(p) === i);

  const roles = [...new Set(members.map((m) => m.role))];

  return {
    slug,
    name: firstNonEmpty(members.map(castDisplayName)) || members[0].fullName,
    roles,
    bio: firstNonEmpty(members.map((m) => m.bio)),
    city: firstNonEmpty(members.map((m) => m.city)),
    instagram: firstNonEmpty(members.map((m) => m.instagram)),
    tiktok: firstNonEmpty(members.map((m) => m.tiktok)),
    website: firstNonEmpty(members.map((m) => m.website)),
    portfolioLink: firstNonEmpty(members.map((m) => m.portfolioLink)),
    photos,
    coverPhoto: photos[0] ?? null,
    awards: dedupeAwards(members.flatMap((m) => m.awards)),
    futureCollaborations: firstNonEmpty(members.map((m) => m.futureCollaborations)),
    isAlumni: members.some((m) => m.isAlumni || m.status === "alumni"),
    volumes: rows.map((row) => ({
      volumeNumber: row.volume.volumeNumber,
      title: row.volume.title,
      slug: row.volume.slug,
      role: mapCastMember(row).role,
      poster: row.volume.posterImage || row.volume.bannerImage,
    })),
  };
}

/** All slugs with a public, profile-enabled record — for static generation. */
export async function getProfileSlugs(): Promise<string[]> {
  const rows = await prisma.castMember.findMany({
    where: {
      enableProfile: true,
      status: { in: PUBLIC_STATUSES },
      volume: { published: true, status: { not: "draft" } },
    },
    select: { slug: true },
  });
  return [...new Set(rows.map((r) => r.slug).filter(Boolean))];
}

export interface AlumniEntry {
  slug: string;
  name: string;
  role: string;
  image: string | null;
  volumes: string[];
  featured: boolean;
  profileEnabled: boolean;
}

/** Deduped alumni directory across published Volumes. */
export async function getAlumniDirectory(): Promise<AlumniEntry[]> {
  const rows = await prisma.castMember.findMany({
    where: {
      status: { in: PUBLIC_STATUSES },
      OR: [{ isAlumni: true }, { status: "alumni" }, { featuredAlumni: true }],
      volume: { published: true, status: { not: "draft" } },
    },
    include: { volume: { select: { volumeNumber: true } } },
    orderBy: [{ featuredAlumni: "desc" }, { sortOrder: "asc" }],
  });

  const map = new Map<string, AlumniEntry>();
  for (const row of rows) {
    const member = mapCastMember(row);
    const key = member.slug || member.id;
    const existing = map.get(key);
    const volumeLabel = `Vol. ${row.volume.volumeNumber}`;
    if (existing) {
      if (!existing.volumes.includes(volumeLabel)) existing.volumes.push(volumeLabel);
      existing.featured = existing.featured || member.featuredAlumni;
      existing.profileEnabled = existing.profileEnabled || member.enableProfile;
      if (!existing.image && member.profilePhoto) existing.image = member.profilePhoto;
    } else {
      map.set(key, {
        slug: member.slug,
        name: castDisplayName(member),
        role: CAST_ROLE_LABELS[member.role],
        image: member.profilePhoto,
        volumes: [volumeLabel],
        featured: member.featuredAlumni,
        profileEnabled: member.enableProfile,
      });
    }
  }

  return [...map.values()];
}

export interface AlumniSpotlight {
  name: string;
  role: string;
  image: string | null;
  volume: string;
  slug: string;
  profileEnabled: boolean;
}

/** Featured alumni across published Volumes — feeds the Community section. */
export async function getFeaturedAlumni(limit = 8): Promise<AlumniSpotlight[]> {
  const rows = await prisma.castMember.findMany({
    where: {
      featuredAlumni: true,
      status: { in: PUBLIC_STATUSES },
      volume: { published: true, status: { not: "draft" } },
    },
    include: { volume: { select: { volumeNumber: true } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return rows.map((row) => {
    const member = mapCastMember(row);
    return {
      name: castDisplayName(member),
      role: CAST_ROLE_LABELS[member.role],
      image: member.profilePhoto,
      volume: `Vol. ${row.volume.volumeNumber}`,
      slug: member.slug,
      profileEnabled: member.enableProfile,
    };
  });
}
