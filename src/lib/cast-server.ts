import { prisma } from "./db";
import { mapCastMember, castDisplayName, CAST_ROLE_LABELS } from "./cast";
import type { CastAppearance, CastMemberDTO } from "./types";

const PUBLIC_STATUSES = ["confirmed", "alumni"];

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

export interface AlumniSpotlight {
  name: string;
  role: string;
  image: string | null;
  volume: string;
}

/** Featured alumni across published Volumes — feeds the Community section. */
export async function getFeaturedAlumni(limit = 8): Promise<AlumniSpotlight[]> {
  const rows = await prisma.castMember.findMany({
    where: {
      featuredAlumni: true,
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
    };
  });
}
