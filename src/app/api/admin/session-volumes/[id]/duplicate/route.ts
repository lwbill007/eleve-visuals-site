import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { revalidateSessionPages } from "@/lib/revalidate-public";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.sessionVolume.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxVolume = await prisma.sessionVolume.aggregate({ _max: { volumeNumber: true } });
  const nextVolumeNumber = (maxVolume._max.volumeNumber ?? 0) + 1;

  let slug = `${source.slug}-copy`;
  let attempt = 1;
  while (await prisma.sessionVolume.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${source.slug}-copy-${attempt}`;
  }

  const item = await prisma.sessionVolume.create({
    data: {
      volumeNumber: nextVolumeNumber,
      title: `${source.title} (Copy)`,
      slug,
      theme: source.theme,
      subtitle: source.subtitle,
      synopsis: source.synopsis,
      posterImage: source.posterImage,
      posterImageAlt: source.posterImageAlt,
      bannerImage: source.bannerImage,
      bannerImageAlt: source.bannerImageAlt,
      moodBoard: source.moodBoard,
      gallery: source.gallery,
      btsGallery: source.btsGallery,
      videos: source.videos,
      status: "draft",
      genre: source.genre,
      year: source.year,
      sessionDate: source.sessionDate,
      sessionTime: source.sessionTime,
      location: source.location,
      city: source.city,
      capacity: source.capacity,
      category: source.category,
      creativeDirector: source.creativeDirector,
      directorsNote: source.directorsNote,
      galleryDelivery: source.galleryDelivery,
      dressCode: source.dressCode,
      runtime: source.runtime,
      requirements: source.requirements,
      timeline: source.timeline,
      applicationDeadline: source.applicationDeadline,
      applicationSettings: source.applicationSettings,
      teaserVideoUrl: source.teaserVideoUrl,
      playlistUrl: source.playlistUrl,
      interviews: source.interviews,
      audio: source.audio,
      productionNotes: source.productionNotes,
      callSheet: source.callSheet,
      creativeBrief: source.creativeBrief,
      wardrobeGuide: source.wardrobeGuide,
      sponsors: source.sponsors,
      resources: source.resources,
      faqs: source.faqs,
      mood: source.mood,
      season: source.season,
      difficulty: source.difficulty,
      colorPalette: source.colorPalette,
      inspirations: source.inspirations,
      testimonials: source.testimonials,
      featured: false,
      published: false,
      showApplyButton: source.showApplyButton,
      archived: false,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      sortOrder: source.sortOrder + 1,
    },
  });

  revalidateSessionPages(slug);
  return NextResponse.json(mapSessionVolume(item));
}
