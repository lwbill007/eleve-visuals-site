import { prisma } from "@/lib/db";
import { getSponsorMetrics } from "@/lib/admin-os-server";
import { linkMemories } from "./graph";
import { writeMemory } from "./store";
import { getWorkspaceId } from "./workspace";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type VolumeSponsor = { name?: string; tier?: string; logo?: string; url?: string };

export async function syncSponsorMemory() {
  const workspaceId = getWorkspaceId();
  const period = monthKey();
  let synced = 0;
  const layers = new Set<string>(["sponsor"]);

  const [metrics, volumes] = await Promise.all([
    getSponsorMetrics(),
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false },
      select: { id: true, title: true, volumeNumber: true, sponsors: true, status: true },
      orderBy: { volumeNumber: "desc" },
      take: 12,
    }),
  ]);

  const deckMemory = await writeMemory({
    workspaceId,
    layer: "sponsor",
    category: "audience_metrics",
    key: `deck-${period}`,
    title: "Sponsor audience snapshot",
    summary: `${metrics.websiteTraffic.toLocaleString()} visits · ${metrics.uniqueVisitors.toLocaleString()} unique · ${metrics.conversionRate}% conversion · ${metrics.applicationGrowth} session applications`,
    value: {
      ...metrics,
      period,
      renewalSignals: {
        trafficHealthy: metrics.websiteTraffic > 500,
        applicationsGrowing: metrics.applicationGrowth > 10,
        conversionHealthy: metrics.conversionRate >= 1,
      },
    },
    confidence: 0.9,
    importance: 85,
    source: "sync",
    sourceRef: "sponsor-metrics",
  });
  synced += 1;

  const sponsorMap = new Map<string, { volumes: string[]; tiers: string[] }>();

  for (const vol of volumes) {
    let sponsors: VolumeSponsor[] = [];
    try {
      sponsors = JSON.parse(vol.sponsors || "[]") as VolumeSponsor[];
    } catch {
      sponsors = [];
    }

    for (const s of sponsors) {
      const name = s.name?.trim();
      if (!name) continue;
      const cur = sponsorMap.get(name) ?? { volumes: [], tiers: [] };
      cur.volumes.push(`Vol. ${vol.volumeNumber}`);
      if (s.tier) cur.tiers.push(s.tier);
      sponsorMap.set(name, cur);
    }
  }

  for (const [name, data] of sponsorMap.entries()) {
    const mem = await writeMemory({
      workspaceId,
      layer: "sponsor",
      category: "partner",
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: name,
      summary: `${data.volumes.length} ÉLEVÉ Sessions volume${data.volumes.length === 1 ? "" : "s"} · ${data.tiers[0] ?? "partner"}`,
      value: {
        name,
        volumes: data.volumes,
        tiers: [...new Set(data.tiers)],
        renewalProbability: data.volumes.length >= 2 ? 0.75 : 0.45,
      },
      confidence: 0.85,
      importance: data.volumes.length >= 2 ? 80 : 65,
      source: "sync",
      sourceRef: "session-volumes",
    });
    synced += 1;
    await linkMemories(mem.id, deckMemory.id, "sponsor_of", data.volumes.length).catch(() => {});
  }

  return { synced, layers: [...layers] };
}
