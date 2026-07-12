/**
 * Source Reliability Engine — trust derived from scored dimensions.
 */

import type { SourceReliability, EvidenceExpiration } from "./types";

export function computeTrustScore(input: {
  authority: number;
  freshness: number;
  historicalAccuracy: number;
  biasPenalty: number;
}): number {
  const raw =
    input.authority * 0.35 +
    input.freshness * 0.25 +
    input.historicalAccuracy * 0.3 +
    (100 - input.biasPenalty) * 0.1;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

const BIAS_PENALTY: Record<SourceReliability["bias"], number> = {
  "Very Low": 2,
  Low: 8,
  Medium: 22,
  High: 45,
  Unknown: 30,
};

export const SOURCE_RELIABILITY_CATALOG: SourceReliability[] = (
  [
    {
      id: "google-search-central",
      name: "Google Search Central",
      authority: 100,
      freshness: 99,
      bias: "Very Low" as const,
      historicalAccuracy: 98,
      category: "Official Documentation",
      expiresInDays: 30,
      freshnessLabel: "Daily / continuous",
      reasoning: ["Primary SEO authority", "Frequent updates — evidence expires in ~30 days"],
    },
    {
      id: "meta-developers",
      name: "Meta / Instagram Developers",
      authority: 95,
      freshness: 92,
      bias: "Low" as const,
      historicalAccuracy: 90,
      category: "Platform Documentation",
      expiresInDays: 21,
      freshnessLabel: "Weekly+",
      reasoning: ["Official platform changes", "Marketing blogs score lower"],
    },
    {
      id: "w3c-wai",
      name: "W3C WAI / WCAG",
      authority: 100,
      freshness: 70,
      bias: "Very Low" as const,
      historicalAccuracy: 99,
      category: "Standards Organization",
      expiresInDays: 180,
      freshnessLabel: "Standards cadence",
      reasoning: ["Accessibility standards change slowly"],
    },
    {
      id: "baymard",
      name: "Baymard Institute",
      authority: 88,
      freshness: 75,
      bias: "Low" as const,
      historicalAccuracy: 86,
      category: "Industry Research",
      expiresInDays: 90,
      freshnessLabel: "Study refresh cycles",
      reasoning: ["Strong UX research; not ÉLEVÉ-specific"],
    },
    {
      id: "nextjs-docs",
      name: "Next.js Documentation",
      authority: 95,
      freshness: 90,
      bias: "Low" as const,
      historicalAccuracy: 94,
      category: "Official Documentation",
      expiresInDays: 60,
      freshnessLabel: "Release-tied",
      reasoning: ["Stack truth for ÉLEVÉ"],
    },
    {
      id: "internal-analytics",
      name: "ÉLEVÉ Website Analytics",
      authority: 100,
      freshness: 100,
      bias: "Very Low" as const,
      historicalAccuracy: 95,
      category: "Internal Measured Data",
      expiresInDays: 7,
      freshnessLabel: "Live / daily",
      reasoning: ["Highest priority over general web for studio decisions"],
    },
  ] satisfies Omit<SourceReliability, "trustScore">[]
).map((s) => ({
  ...s,
  trustScore: computeTrustScore({
    authority: s.authority,
    freshness: s.freshness,
    historicalAccuracy: s.historicalAccuracy,
    biasPenalty: BIAS_PENALTY[s.bias],
  }),
}));

export function getSourceReliability(id: string): SourceReliability | undefined {
  return SOURCE_RELIABILITY_CATALOG.find((s) => s.id === id);
}

export function evaluateEvidenceExpiration(input: {
  collectedAt: string | null;
  sourceId?: string;
  defaultExpiresInDays?: number;
}): EvidenceExpiration {
  const source = input.sourceId ? getSourceReliability(input.sourceId) : undefined;
  const expiresInDays = source?.expiresInDays ?? input.defaultExpiresInDays ?? 30;

  if (!input.collectedAt) {
    return {
      status: "Unknown",
      ageDays: null,
      expiresInDays,
      expiresOn: null,
      reason: "No collection timestamp — treat as unverified until refreshed",
      refreshRecommended: true,
      refreshBy: null,
    };
  }

  const collected = new Date(input.collectedAt).getTime();
  const ageDays = Math.max(0, Math.round((Date.now() - collected) / 86400000));
  const expiresOnDate = new Date(collected + expiresInDays * 86400000);
  const expiresOn = expiresOnDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (ageDays > expiresInDays) {
    return {
      status: "Expired",
      ageDays,
      expiresInDays,
      expiresOn,
      reason: source
        ? `${source.name} evidence typically expires after ~${expiresInDays} days`
        : `Evidence older than ${expiresInDays} days`,
      refreshRecommended: true,
      refreshBy: "Immediately",
    };
  }

  if (ageDays > expiresInDays * 0.6) {
    return {
      status: "Aging",
      ageDays,
      expiresInDays,
      expiresOn,
      reason: "Approaching expiration — refresh before relying on this for execution",
      refreshRecommended: true,
      refreshBy: expiresOn,
    };
  }

  return {
    status: "Fresh",
    ageDays,
    expiresInDays,
    expiresOn,
    reason: `${ageDays} day(s) old — within ${expiresInDays}-day window`,
    refreshRecommended: false,
    refreshBy: expiresOn,
  };
}

/** Confidence contribution from sources (0–100), never invented. */
export function confidenceFromSources(sourceIds: string[]): {
  score: number;
  why: string[];
} {
  const sources = sourceIds
    .map(getSourceReliability)
    .filter((s): s is SourceReliability => Boolean(s));
  if (sources.length === 0) {
    return { score: 0, why: ["No rated sources — confidence cannot be derived from source quality"] };
  }
  const avg = Math.round(sources.reduce((s, x) => s + x.trustScore, 0) / sources.length);
  const single = sources.length === 1;
  const score = single ? Math.min(avg, 62) : avg;
  return {
    score,
    why: [
      `Derived from ${sources.length} source trust score(s): ${sources.map((s) => `${s.name} ${s.trustScore}`).join(", ")}`,
      single ? "Single-source cap applied (62 max) until corroboration" : "Multi-source trust averaged",
    ],
  };
}
