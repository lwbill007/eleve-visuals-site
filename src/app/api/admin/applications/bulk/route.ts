import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { notifyBulkApplicationStatusChanges } from "@/lib/application-notifications";
import { maybeAutoCloseVolumeAfterAccept } from "@/lib/session-application-server";
import { parseApplicationSettings } from "@/lib/session-application";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids = body.ids as string[] | undefined;
  const status = body.status as ApplicationStatus | undefined;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No applications selected" }, { status: 400 });
  }
  if (!status || !(APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await prisma.submission.updateMany({
    where: { id: { in: ids }, type: "session" },
    data: { status },
  });

  void notifyBulkApplicationStatusChanges(ids, status);

  if (status === "accepted") {
    const submissions = await prisma.submission.findMany({
      where: { id: { in: ids }, type: "session", sessionVolumeId: { not: null } },
      select: { sessionVolumeId: true },
    });
    const volumeIds = [...new Set(submissions.map((s) => s.sessionVolumeId).filter(Boolean))] as string[];
    for (const volumeId of volumeIds) {
      const volume = await prisma.sessionVolume.findUnique({ where: { id: volumeId } });
      if (!volume) continue;
      const settings = parseApplicationSettings(volume.applicationSettings);
      await maybeAutoCloseVolumeAfterAccept(volumeId, settings);
    }
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}
