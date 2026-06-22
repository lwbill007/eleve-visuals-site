import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertValidMediaUrl } from "@/lib/image-url";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const filename = typeof body.filename === "string" ? body.filename : "upload";

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    assertValidMediaUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await prisma.mediaAsset.upsert({
      where: { url },
      create: { url, filename },
      update: { filename },
    });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("[media-index] failed:", error);
    return NextResponse.json({ error: "Failed to index media" }, { status: 500 });
  }
}
