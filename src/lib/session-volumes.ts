import { prisma } from "./db";
import { mapSessionVolume, isPublicSessionVolume, resolveSessionPosterImage } from "./session-volume";
import type { SessionVolumeDTO } from "./types";

export async function getAllSessionVolumes(admin = false): Promise<SessionVolumeDTO[]> {
  const items = await prisma.sessionVolume.findMany({
    where: admin ? undefined : { published: true, status: { not: "draft" } },
    orderBy: [{ volumeNumber: "desc" }, { sortOrder: "asc" }],
  });
  return items.map(mapSessionVolume).filter((v) => admin || isPublicSessionVolume(v));
}

export async function getSessionVolumeBySlug(slug: string): Promise<SessionVolumeDTO | null> {
  const item = await prisma.sessionVolume.findUnique({ where: { slug } });
  if (!item) return null;
  const volume = mapSessionVolume(item);
  if (!isPublicSessionVolume(volume)) return null;
  return volume;
}

export async function getFeaturedSessionVolume(): Promise<SessionVolumeDTO | null> {
  const featured = await prisma.sessionVolume.findFirst({
    where: { published: true, featured: true, status: { not: "draft" } },
    orderBy: { volumeNumber: "desc" },
  });
  if (featured) return mapSessionVolume(featured);

  const open = await prisma.sessionVolume.findFirst({
    where: { published: true, status: "applications_open" },
    orderBy: { volumeNumber: "desc" },
  });
  if (open) return mapSessionVolume(open);

  const latest = await prisma.sessionVolume.findFirst({
    where: { published: true, status: { not: "draft" } },
    orderBy: { volumeNumber: "desc" },
  });
  return latest ? mapSessionVolume(latest) : null;
}

export async function getOpenSessionVolume(): Promise<SessionVolumeDTO | null> {
  const item = await prisma.sessionVolume.findFirst({
    where: { published: true, status: "applications_open", showApplyButton: true },
    orderBy: { volumeNumber: "desc" },
  });
  return item ? mapSessionVolume(item) : null;
}

export function getHeroPosterFromVolumes(volumes: SessionVolumeDTO[]): {
  poster: string | null;
  alt: string;
} {
  const featured = volumes.find((v) => v.featured) || volumes[0];
  if (!featured) return { poster: null, alt: "ÉLEVÉ Sessions" };
  return {
    poster: resolveSessionPosterImage(featured),
    alt: featured.posterImageAlt || featured.title,
  };
}
