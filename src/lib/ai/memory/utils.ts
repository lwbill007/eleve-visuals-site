import type { MemoryLayer } from "./types";
import { LEGACY_CATEGORY_TO_LAYER } from "./types";

export function resolveLayer(category: string, layer?: MemoryLayer): MemoryLayer {
  if (layer) return layer;
  return LEGACY_CATEGORY_TO_LAYER[category] ?? "operational";
}

export function layerLabel(layer: MemoryLayer): string {
  const labels: Record<MemoryLayer, string> = {
    business: "Business",
    crm: "CRM",
    brand: "Brand",
    creative: "Creative",
    marketing: "Marketing",
    financial: "Financial",
    sessions: "ÉLEVÉ Sessions",
    sponsor: "Sponsor",
    operational: "Operational",
  };
  return labels[layer];
}

export function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function memorySearchText(record: {
  title: string;
  summary: string;
  category: string;
  key: string;
  tags: string[];
  value: Record<string, unknown>;
}): string {
  return [
    record.title,
    record.summary,
    record.category,
    record.key,
    record.tags.join(" "),
    JSON.stringify(record.value),
  ]
    .join(" ")
    .toLowerCase();
}
