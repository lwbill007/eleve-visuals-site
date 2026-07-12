/**
 * Research confidence score — explain why, never inflate.
 */

import type {
  MultiSourceChecklist,
  ResearchConfidenceLabel,
  ResearchConfidenceScore,
  ResearchSource,
  BusinessRelevanceResult,
} from "./types";

export function scoreResearchConfidence(input: {
  sources: ResearchSource[];
  multiSource: MultiSourceChecklist;
  relevance: BusinessRelevanceResult;
  unknowns: string[];
  conflicts: number;
  connectorAvailable: boolean;
}): ResearchConfidenceScore {
  const verified = input.sources.filter((s) => s.truthKind === "Verified External Research");
  const sourceQuality =
    verified.length === 0
      ? 0
      : Math.round(
          verified.reduce((s, x) => s + x.quality.overall, 0) / verified.length
        );

  const sourceAgreement =
    input.conflicts > 0
      ? Math.max(35, 88 - input.conflicts * 16)
      : verified.length >= 2
        ? 88
        : verified.length === 1
          ? 55
          : 0;

  const freshness =
    verified.length === 0
      ? 0
      : Math.round(
          verified.reduce((s, x) => s + x.quality.freshness, 0) / verified.length
        );

  const businessRelevance = input.relevance.relevant
    ? input.relevance.ignoredAsNoise
      ? 10
      : Math.min(
          95,
          55 + input.relevance.axes.filter((a) => a.affected).length * 8
        )
    : 20;

  const coverageBits = [
    input.multiSource.officialDocumentation,
    input.multiSource.industryResearch,
    input.multiSource.independentAnalysis,
    input.multiSource.internalBusinessData,
    input.multiSource.historicalPerformance,
    input.multiSource.currentTrends,
  ].filter(Boolean).length;
  const evidenceCoverage = Math.round((coverageBits / 6) * 100);

  const unknownsCount = input.unknowns.length;
  const singleSourceWarning = verified.length === 1;

  let overall = Math.round(
    sourceQuality * 0.25 +
      sourceAgreement * 0.2 +
      freshness * 0.15 +
      businessRelevance * 0.2 +
      evidenceCoverage * 0.2
  );

  if (!input.connectorAvailable && verified.length === 0) overall = Math.min(overall, 28);
  if (singleSourceWarning) overall = Math.min(overall, 62);
  if (input.multiSource.warning) overall = Math.min(overall, overall);

  const label: ResearchConfidenceLabel =
    overall >= 80 ? "High" : overall >= 50 ? "Medium" : "Low";

  const why: string[] = [];
  if (verified.length === 0) {
    why.push("No Verified External Research sources collected — overall capped.");
  } else {
    why.push(`${verified.length} verified external source(s); avg quality ${sourceQuality}%.`);
  }
  why.push(
    singleSourceWarning
      ? "Single-source warning active — corroboration missing."
      : verified.length >= 2
        ? "Multi-source corroboration present."
        : "Source agreement not established."
  );
  why.push(`Business relevance ${businessRelevance}% — ${input.relevance.reason}`);
  why.push(`Evidence coverage ${evidenceCoverage}% across six checklist dimensions.`);
  if (input.conflicts > 0) why.push(`${input.conflicts} contradiction cluster(s) reduced agreement.`);
  if (unknownsCount > 0) why.push(`${unknownsCount} explicit unknown(s) remain.`);
  if (!input.connectorAvailable) why.push("Live web connector unavailable — cannot invent findings.");

  return {
    overall,
    sourceQuality,
    sourceAgreement,
    freshness,
    businessRelevance,
    evidenceCoverage,
    unknownsCount,
    label,
    why,
    singleSourceWarning,
  };
}
