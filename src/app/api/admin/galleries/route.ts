import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateAccessCode,
  hashAccessCode,
} from "@/lib/gallery/access";
import { uniqueGallerySlug } from "@/lib/gallery/service";

const createSchema = z.object({
  title: z.string().min(1).max(160),
  clientName: z.string().max(160).default(""),
  clientEmail: z.string().email().or(z.literal("")).default(""),
  sessionType: z.string().max(120).default(""),
  description: z.string().max(4000).default(""),
  submissionId: z.string().max(64).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  downloadEnabled: z.boolean().default(true),
  downloadQuality: z.enum(["web", "high"]).default("high"),
  allowDownloadOriginals: z.boolean().default(false),
  favoriteEnabled: z.boolean().default(true),
  commentsEnabled: z.boolean().default(false),
  watermarkEnabled: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    await requireMinimumRole("viewer");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = 25;

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { clientName: { contains: search, mode: "insensitive" as const } },
            { clientEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [galleries, total] = await Promise.all([
    prisma.gallery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { photos: true, favorites: true } },
      },
    }),
    prisma.gallery.count({ where }),
  ]);

  return NextResponse.json({
    galleries: galleries.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      clientName: g.clientName,
      sessionType: g.sessionType,
      status: g.status,
      photoCount: g._count.photos,
      favoriteCount: g._count.favorites,
      expiresAt: g.expiresAt,
      createdAt: g.createdAt,
    })),
    total,
    page,
    perPage,
  });
}

/**
 * Create a gallery. The access code is generated here and returned exactly
 * once — only its bcrypt hash is stored, so it can be regenerated but never
 * recovered. That is the point.
 */
export async function POST(request: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid gallery", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const code = generateAccessCode();
  const gallery = await prisma.gallery.create({
    data: {
      slug: await uniqueGallerySlug(input.title),
      title: input.title,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      sessionType: input.sessionType,
      description: input.description,
      submissionId: input.submissionId || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      downloadEnabled: input.downloadEnabled,
      downloadQuality: input.downloadQuality,
      allowDownloadOriginals: input.allowDownloadOriginals,
      favoriteEnabled: input.favoriteEnabled,
      commentsEnabled: input.commentsEnabled,
      watermarkEnabled: input.watermarkEnabled,
      accessCodeHash: await hashAccessCode(code),
      sections: { create: { title: "Full Gallery", sortOrder: 0 } },
    },
  });

  return NextResponse.json({ gallery: { id: gallery.id, slug: gallery.slug }, accessCode: code });
}
