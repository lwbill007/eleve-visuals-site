import { prisma } from "@/lib/db";
import { normalizeApplicationStatus } from "@/lib/types";
import { linkMemories } from "./graph";
import { writeMemory } from "./store";
import { getWorkspaceId } from "./workspace";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syncSessionsMemory() {
  const workspaceId = getWorkspaceId();
  const period = monthKey();
  let synced = 0;
  const layers = new Set<string>(["sessions"]);

  const volumes = await prisma.sessionVolume.findMany({
    where: { archived: false },
    orderBy: { volumeNumber: "desc" },
    take: 16,
    include: { _count: { select: { cast: true } } },
  });

  const applications = await prisma.submission.findMany({
    where: { type: "session" },
    select: { status: true, data: true, createdAt: true },
  });

  let topVolumeId: string | null = null;
  let topApps = 0;

  for (const vol of volumes) {
    const volApps = applications.filter((a) => {
      try {
        const d = JSON.parse(a.data) as Record<string, unknown>;
        return d.sessionVolumeTitle === vol.title || d.volumeNumber === vol.volumeNumber;
      } catch {
        return false;
      }
    });

    const pending = volApps.filter((a) => normalizeApplicationStatus(a.status) === "pending_review").length;
    const accepted = volApps.filter((a) => ["accepted", "confirmed", "cast"].includes(a.status)).length;

    let moodBoard: string[] = [];
    let inspirations: string[] = [];
    let colorPalette: string[] = [];
    try {
      moodBoard = JSON.parse(vol.moodBoard || "[]");
      inspirations = JSON.parse(vol.inspirations || "[]");
      colorPalette = JSON.parse(vol.colorPalette || "[]");
    } catch {
      /* ignore */
    }

    const acceptanceRate = volApps.length > 0 ? Math.round((accepted / volApps.length) * 100) : 0;

    const mem = await writeMemory({
      workspaceId,
      layer: "sessions",
      category: "volume",
      key: `vol-${vol.volumeNumber}`,
      title: `Vol. ${vol.volumeNumber} — ${vol.title}`,
      summary: `${vol.theme || vol.genre || "Session"} · ${volApps.length} applications · ${acceptanceRate}% acceptance · ${vol._count.cast} cast`,
      value: {
        volumeNumber: vol.volumeNumber,
        title: vol.title,
        theme: vol.theme,
        genre: vol.genre,
        status: vol.status,
        mood: vol.mood,
        sessionDate: vol.sessionDate,
        applications: volApps.length,
        pendingReview: pending,
        accepted,
        acceptanceRate,
        castCount: vol._count.cast,
        moodBoard: moodBoard.slice(0, 8),
        inspirations: inspirations.slice(0, 6),
        colorPalette,
        creativeBrief: vol.creativeBrief.slice(0, 400),
      },
      confidence: vol.published ? 0.92 : 0.7,
      importance: vol.status === "applications_open" ? 95 : volApps.length > topApps ? 88 : 70,
      source: "sync",
      sourceRef: `volume:${vol.id}`,
      tags: [vol.theme, vol.genre, vol.season].filter(Boolean),
    });
    synced += 1;

    if (volApps.length > topApps) {
      topApps = volApps.length;
      topVolumeId = mem.id;
    }
  }

  if (topVolumeId && topApps > 0) {
    await writeMemory({
      workspaceId,
      layer: "sessions",
      category: "benchmark",
      key: `top-volume-${period}`,
      title: "Highest-application Sessions volume",
      summary: `${topApps} applications — study theme, marketing, and timing for next volume`,
      value: { memoryId: topVolumeId, applications: topApps, period },
      confidence: 0.88,
      importance: 90,
      source: "sync",
      sourceRef: "applications-analysis",
    });
    synced += 1;
  }

  return { synced, layers: [...layers] };
}
