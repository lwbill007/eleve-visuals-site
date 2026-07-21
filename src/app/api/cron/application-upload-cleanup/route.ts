import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import {
  applicantMediaUrl,
  getSessionUploadBlobOptions,
  isSessionUploadStorageConfigured,
  putPrivateApplicantBlob,
} from "@/lib/session-private-media";

const MAX_MIGRATION_BYTES = 5 * 1024 * 1024;

async function migrateLegacyApplicantMedia(origin: string) {
  if (!isSessionUploadStorageConfigured()) return { scanned: 0, migrated: 0, failed: 0 };

  const assets = await prisma.mediaAsset.findMany({
    where: {
      purpose: "session-application",
      url: { not: { contains: ".private.blob.vercel-storage.com" } },
    },
    select: {
      id: true,
      url: true,
      submissionId: true,
    },
    take: 10,
  });

  let migrated = 0;
  let failed = 0;
  for (const asset of assets) {
    let privateUrl = "";
    try {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`Legacy media returned HTTP ${response.status}`);
      const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
        throw new Error(`Unsupported legacy media type: ${contentType || "unknown"}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > MAX_MIGRATION_BYTES) {
        throw new Error("Legacy media exceeds migration size limit");
      }
      const extension =
        contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      privateUrl = await putPrivateApplicantBlob(
        `applications/migrated/${asset.id}.${extension}`,
        bytes,
        contentType
      );

      const submission = asset.submissionId
        ? await prisma.submission.findUnique({
            where: { id: asset.submissionId },
            select: { data: true },
          })
        : null;
      let submissionData: string | null = null;
      if (submission) {
        const parsed = JSON.parse(submission.data) as Record<string, unknown>;
        if (Array.isArray(parsed.portfolioImages)) {
          parsed.portfolioImages = parsed.portfolioImages.map((url) =>
            url === asset.url ? applicantMediaUrl(origin, asset.id) : url
          );
        }
        submissionData = JSON.stringify(parsed);
      }

      await prisma.$transaction([
        prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { url: privateUrl },
        }),
        ...(asset.submissionId && submissionData
          ? [
              prisma.submission.update({
                where: { id: asset.submissionId },
                data: { data: submissionData },
              }),
            ]
          : []),
      ]);
      try {
        await del(asset.url);
      } catch (error) {
        console.error("[application-upload-migration] legacy delete failed", asset.id, error);
      }
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error("[application-upload-migration] failed", asset.id, error);
      if (privateUrl) {
        await del(privateUrl, getSessionUploadBlobOptions()).catch(() => {});
      }
    }
  }
  return { scanned: assets.length, migrated, failed };
}

export async function GET(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.MEDIA_MIGRATION_SECRET].filter(
    (value): value is string => Boolean(value)
  );
  if (process.env.NODE_ENV === "production" && secrets.length === 0) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (secrets.length > 0 && !secrets.some((secret) => authorization === `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const migration = await migrateLegacyApplicantMedia(
    process.env.CANONICAL_SITE_URL ?? new URL(request.url).origin
  );
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
        if (isSessionUploadStorageConfigured()) {
          try {
            await del(asset.url, getSessionUploadBlobOptions());
          } catch {
            await del(asset.url);
          }
        } else {
          await del(asset.url);
        }
      }
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
      removed += 1;
    } catch (error) {
      console.error("[application-upload-cleanup] failed", asset.id, error);
    }
  }

  return NextResponse.json({ migration, cleanup: { scanned: orphans.length, removed } });
}
