import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { mapSessionVolume } from "@/lib/session-volume";
import { parseSessionVolumeBody } from "@/lib/session-volume-admin";
import { validateFeaturedMediaId } from "@/lib/volume-videos-server";
import { revalidateSessionPages } from "@/lib/revalidate-public";

async function sanitizeFeaturedMediaId(
  data: ReturnType<typeof parseSessionVolumeBody>
): Promise<ReturnType<typeof parseSessionVolumeBody>> {
  const lists = {
    videos: JSON.parse(data.videos) as string[],
    interviews: JSON.parse(data.interviews) as string[],
    teaserVideoUrl: data.teaserVideoUrl,
  };
  const featuredMediaId = await validateFeaturedMediaId(data.featuredMediaId, lists);
  return { ...data, featuredMediaId };
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.sessionVolume.findMany({
    orderBy: [{ volumeNumber: "desc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(items.map(mapSessionVolume));
}

export async function POST(request: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseSessionVolumeBody(body);
  const data = await sanitizeFeaturedMediaId(parsed);

  if (!data.title || !data.slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }
  if (
    data.status === "applications_open" &&
    data.applicationDeadline &&
    data.applicationDeadline.getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "Application deadline must be in the future" }, { status: 400 });
  }

  if (data.featured) {
    await prisma.sessionVolume.updateMany({ data: { featured: false } });
  }

  const item = await prisma.$transaction(async (tx) => {
    if (data.status === "applications_open") {
      await tx.sessionVolume.updateMany({
        where: { status: "applications_open" },
        data: { status: "applications_closed" },
      });
    }
    return tx.sessionVolume.create({
      data: {
        ...data,
        ...(data.status === "applications_open"
          ? { published: true, showApplyButton: true, archived: false }
          : {}),
        applicationDeadline:
          data.applicationDeadline === undefined ? null : data.applicationDeadline,
      },
    });
  });

  revalidateSessionPages(data.slug);
  return NextResponse.json(mapSessionVolume(item));
}
