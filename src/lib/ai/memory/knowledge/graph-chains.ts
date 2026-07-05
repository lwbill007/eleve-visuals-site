import { linkMemories } from "../graph";
import { getMemory } from "../store";
import { getWorkspaceId } from "../workspace";
import type { KnowledgeFinding } from "./types";

export interface ChainLinkResult {
  linksCreated: number;
  chains: string[];
}

async function resolveId(layer: string, category: string, key: string, cache: Map<string, string>) {
  const fp = `${layer}:${category}:${key}`;
  if (cache.has(fp)) return cache.get(fp)!;
  const mem = await getMemory(layer as Parameters<typeof getMemory>[0], category, key, getWorkspaceId());
  if (mem) cache.set(fp, mem.id);
  return mem?.id;
}

async function link(
  from: { layer: string; category: string; key: string },
  to: { layer: string; category: string; key: string },
  relationType: string,
  cache: Map<string, string>,
  meta: { refreshId: string; sourcePage?: string }
): Promise<boolean> {
  const fromId = await resolveId(from.layer, from.category, from.key, cache);
  const toId = await resolveId(to.layer, to.category, to.key, cache);
  if (!fromId || !toId || fromId === toId) return false;
  await linkMemories(fromId, toId, relationType, 1, meta).catch(() => {});
  return true;
}

export async function buildConversionChains(
  findings: KnowledgeFinding[],
  refreshId: string
): Promise<ChainLinkResult> {
  const cache = new Map<string, string>();
  let linksCreated = 0;
  const chains: string[] = [];

  const volumeFindings = findings.filter((f) => f.category === "volume");
  for (const vol of volumeFindings) {
    const chain = [
      { layer: vol.layer, category: vol.category, key: vol.key },
      { layer: "sessions", category: "page", key: "sessions-hub" },
      { layer: "sessions", category: "applications", key: "pipeline" },
      { layer: "business", category: "page", key: "booking" },
      { layer: "financial", category: "pipeline", key: "pipeline-live" },
      { layer: "brand", category: "testimonials", key: "social-proof" },
    ];

    for (let i = 0; i < chain.length - 1; i++) {
      const ok = await link(chain[i], chain[i + 1], i === 0 ? "showcases" : "feeds", cache, {
        refreshId,
        sourcePage: vol.sourcePage,
      });
      if (ok) linksCreated += 1;
    }
    chains.push(`${vol.title} → Sessions → Applications → Booking → Pipeline → Testimonials`);
  }

  const projects = findings.filter((f) => f.category === "project");
  for (const proj of projects.slice(0, 12)) {
    const steps = [
      { layer: proj.layer, category: proj.category, key: proj.key },
      { layer: "creative", category: "page", key: "portfolio-index" },
      { layer: "brand", category: "page", key: "homepage" },
      { layer: "business", category: "page", key: "booking" },
    ];
    for (let i = 0; i < steps.length - 1; i++) {
      const ok = await link(steps[i], steps[i + 1], "converts_via", cache, {
        refreshId,
        sourcePage: proj.sourcePage,
      });
      if (ok) linksCreated += 1;
    }
    chains.push(`${proj.title} → Portfolio → Homepage → Booking`);
  }

  const services = findings.filter((f) => f.category === "package");
  for (const svc of services) {
    const ok = await link(
      { layer: svc.layer, category: svc.category, key: svc.key },
      { layer: "business", category: "page", key: "booking" },
      "converts_to",
      cache,
      { refreshId, sourcePage: svc.sourcePage }
    );
    if (ok) {
      linksCreated += 1;
      chains.push(`${svc.title} → Booking`);
    }
  }

  return { linksCreated, chains };
}
