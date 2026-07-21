import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    submissionsToday,
    submissionsWeek,
    submissionsMonth,
    sentCount,
    failedCount,
    skippedCount,
    failedRecent,
    respondedSubmissions,
  ] = await Promise.all([
    prisma.submission.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.submission.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.submission.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.notificationLog.count({ where: { status: "sent", createdAt: { gte: monthAgo } } }),
    prisma.notificationLog.count({ where: { status: "failed", createdAt: { gte: monthAgo } } }),
    prisma.notificationLog.count({ where: { status: "skipped", createdAt: { gte: monthAgo } } }),
    prisma.notificationLog.count({
      where: { status: "failed", archived: false },
    }),
    prisma.submission.findMany({
      where: { readAt: { not: null, gte: monthAgo } },
      select: { createdAt: true, readAt: true },
      take: 1000,
    }),
  ]);

  const totalDeliveries = sentCount + failedCount;
  const successRate =
    totalDeliveries === 0 ? null : Math.round((sentCount / totalDeliveries) * 100);

  let avgReadMs: number | null = null;
  if (respondedSubmissions.length > 0) {
    const sum = respondedSubmissions.reduce((acc, s) => {
      if (!s.readAt) return acc;
      return acc + (s.readAt.getTime() - s.createdAt.getTime());
    }, 0);
    avgReadMs = Math.round(sum / respondedSubmissions.length);
  }

  return NextResponse.json({
    submissions: {
      today: submissionsToday,
      week: submissionsWeek,
      month: submissionsMonth,
    },
    delivery: {
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      successRate,
      openFailures: failedRecent,
    },
    avgReadMs,
    readCount: respondedSubmissions.length,
  });
}
