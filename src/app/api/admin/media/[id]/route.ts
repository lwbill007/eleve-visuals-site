import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobUrl } from "@/lib/blob-storage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const item = await prisma.mediaAsset.update({
      where: { id },
      data: {
        filename: typeof body.filename === "string" ? body.filename : undefined,
        alt: typeof body.alt === "string" ? body.alt : undefined,
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [portfolio, service, testimonial, session, content] = await Promise.all([
      prisma.portfolioItem.findFirst({
        where: {
          OR: [
            { image: asset.url },
            { heroImage: asset.url },
            { gallery: { contains: asset.url } },
            { btsGallery: { contains: asset.url } },
            { videos: { contains: asset.url } },
          ],
        },
        select: { title: true },
      }),
      prisma.service.findFirst({
        where: {
          OR: [
            { image: asset.url },
            { bannerImage: asset.url },
            { thumbnailImage: asset.url },
          ],
        },
        select: { title: true },
      }),
      prisma.testimonial.findFirst({
        where: { image: asset.url },
        select: { name: true },
      }),
      prisma.sessionVolume.findFirst({
        where: {
          OR: [
            { posterImage: asset.url },
            { bannerImage: asset.url },
            { moodBoard: { contains: asset.url } },
            { gallery: { contains: asset.url } },
            { btsGallery: { contains: asset.url } },
            { videos: { contains: asset.url } },
            { interviews: { contains: asset.url } },
          ],
        },
        select: { title: true },
      }),
      prisma.siteContent.findFirst({
        where: { value: { contains: asset.url } },
        select: { key: true },
      }),
    ]);
    const usedBy = [
      portfolio ? `portfolio “${portfolio.title}”` : null,
      service ? `service “${service.title}”` : null,
      testimonial ? `testimonial by “${testimonial.name}”` : null,
      session ? `session “${session.title}”` : null,
      content ? `site content “${content.key}”` : null,
    ].filter((value): value is string => Boolean(value));
    if (usedBy.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this asset is used by ${usedBy.join(", ")}.`, usedBy },
        { status: 409 }
      );
    }

    await deleteBlobUrl(asset.url);
    await prisma.mediaAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
