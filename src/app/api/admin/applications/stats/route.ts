import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseApplicationSettings } from "@/lib/session-application";
import { countAcceptedApplications } from "@/lib/session-application-server";
import { normalizeApplicationStatus } from "@/lib/types";

function parseData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const volumeId = searchParams.get("volumeId");

  const where = {
    type: "session",
    ...(volumeId ? { sessionVolumeId: volumeId } : {}),
  };

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const byRole: Record<string, number> = {};
  let accepted = 0;
  let waitlisted = 0;
  let declined = 0;
  const dailyMap = new Map<string, number>();

  for (const row of submissions) {
    const data = parseData(row.data);
    const status = normalizeApplicationStatus(row.status);
    if (status === "accepted") accepted += 1;
    if (status === "waitlisted") waitlisted += 1;
    if (status === "declined") declined += 1;

    const roles = Array.isArray(data.roles)
      ? (data.roles as string[])
      : typeof data.role === "string"
        ? [data.role]
        : [];
    for (const role of roles) {
      byRole[role] = (byRole[role] || 0) + 1;
    }

    const day = row.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }

  const total = submissions.length;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  let remainingSpots: number | null = null;
  if (volumeId) {
    const volume = await prisma.sessionVolume.findUnique({ where: { id: volumeId } });
    if (volume) {
      const settings = parseApplicationSettings(volume.applicationSettings);
      if (settings.maxCapacity != null) {
        const filled = await countAcceptedApplications(volumeId);
        remainingSpots = Math.max(settings.maxCapacity - filled, 0);
      }
    }
  }

  const dailyTrend = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totalApplications: total,
    byRole,
    acceptanceRate,
    waitlistCount: waitlisted,
    declinedCount: declined,
    acceptedCount: accepted,
    remainingSpots,
    dailyTrend,
  });
}
