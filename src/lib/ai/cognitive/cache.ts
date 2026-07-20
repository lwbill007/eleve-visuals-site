import { invalidateCache } from "../cache";

/** Bust all intelligence caches after refresh, mission completion, or force-reload. */
export async function invalidateIntelligenceCaches(): Promise<void> {
  await Promise.all([
    invalidateCache("executive-os"),
    invalidateCache("executive-intelligence"),
    invalidateCache("cognitive-architecture"),
    invalidateCache("daily-briefing"),
    invalidateCache("intelligence-suite"),
    invalidateCache("truth-metrics"),
    invalidateCache("executive-context"),
    invalidateCache("operator-metrics"),
    invalidateCache("executive-report-v3"),
  ]);
}
