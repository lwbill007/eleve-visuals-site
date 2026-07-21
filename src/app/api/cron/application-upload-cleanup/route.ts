import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphans = await prisma.mediaAsset.findMany({
    where: {
      purpose: "session-application",
      claimedAt: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, url: true },
    take: 100,
  });

  let removed = 0;
  for (const asset of orphans) {
    try {
      if (asset.url.startsWith("https://")) {
        await del(asset.url);
      }
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
      removed += 1;
    } catch (error) {
      console.error("[application-upload-cleanup] failed", asset.id, error);
    }
  }

  return NextResponse.json({ scanned: orphans.length, removed });
}
