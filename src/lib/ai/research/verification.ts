/**
 * Multi-source verification + contradiction helpers.
 */

import type {
  ConflictingFinding,
  MultiSourceChecklist,
  ResearchSource,
} from "./types";

export function buildMultiSourceChecklist(input: {
  sources: ResearchSource[];
  hasInternalData: boolean;
  hasHistorical: boolean;
  hasTrendSignal: boolean;
}): MultiSourceChecklist {
  const titles = input.sources.map((s) => `${s.title} ${s.publisher ?? ""} ${s.tier}`).join(" ").toLowerCase();

  const officialDocumentation =
    input.sources.some((s) => s.tier === "highest") ||
    /\b(official|documentation|docs\.|search central|developer)\b/i.test(titles);

  const industryResearch =
    input.sources.some((s) => s.tier === "highest" || s.tier === "second") &&
    /\b(industry|report|benchmark|association)\b/i.test(titles);

  const independentAnalysis =
    input.sources.filter((s) => s.truthKind === "Verified External Research").length >= 2 ||
    input.sources.some((s) => s.tier === "second");

  const checklist: MultiSourceChecklist = {
    officialDocumentation,
    industryResearch,
    independentAnalysis,
    internalBusinessData: input.hasInternalData,
    historicalPerformance: input.hasHistorical,
    currentTrends: input.hasTrendSignal,
    metMinimum: false,
    warning: null,
  };

  const verifiedCount = input.sources.filter((s) => s.truthKind === "Verified External Research").length;
  const checksMet = [
    checklist.officialDocumentation,
    checklist.industryResearch,
    checklist.independentAnalysis,
    checklist.internalBusinessData,
    checklist.historicalPerformance,
    checklist.currentTrends,
  ].filter(Boolean).length;

  // Minimum for external recommendations: prefer ≥2 verified sources + internal alignment
  checklist.metMinimum =
    (verifiedCount >= 2 && checklist.internalBusinessData) ||
    (checksMet >= 4 && verifiedCount >= 1);

  if (verifiedCount === 1) {
    checklist.warning =
      "Recommendation supported by a single external source. Confidence reduced until corroboration exists.";
  } else if (verifiedCount === 0 && !checklist.internalBusinessData) {
    checklist.warning =
      "No verified external sources and weak internal coverage — additional verified research is required.";
  } else if (!checklist.metMinimum) {
    checklist.warning =
      "Multi-source minimum not met (official + independent + internal preferred). Treat recommendations as provisional.";
  }

  return checklist;
}

export function detectConflicts(sources: ResearchSource[]): ConflictingFinding[] {
  const withClaims = sources.filter((s) => s.claim && s.claim.trim().length > 0);
  if (withClaims.length < 2) return [];

  // Naive disagreement: different claims from different publishers (real NLP later)
  const byPublisher = new Map<string, string>();
  for (const s of withClaims) {
    const key = (s.publisher || s.title).toLowerCase();
    if (!byPublisher.has(key)) byPublisher.set(key, s.claim!);
  }
  if (byPublisher.size < 2) return [];

  const values = [...byPublisher.values()];
  const unique = new Set(values.map((v) => v.toLowerCase().slice(0, 80)));
  if (unique.size < 2) return [];

  return [
    {
      id: "conflict-1",
      claims: [...byPublisher.entries()].map(([source, claim]) => ({ source, claim })),
      internalAlignment: null,
      recommendation:
        "Sources disagree. Prefer the claim that aligns with measured internal analytics; otherwise defer until corroboration.",
      confidence: 55,
      truthKind: "AI Analysis",
    },
  ];
}
