/**
 * Executive research pipeline v2 — self-aware evidence quality.
 * Never invents sources when the connector is absent.
 */

import { randomUUID } from "crypto";
import { INSUFFICIENT_EVIDENCE_STATEMENT, RESEARCH_DISCIPLINE } from "./charter";
import { evaluateResearchGate } from "./gate";
import { scoreResearchConfidence } from "./confidence";
import { buildMultiSourceChecklist, detectConflicts } from "./verification";
import {
  SOURCE_PROFILE_CATALOG,
  buildCompetitiveSection,
  buildEvidenceTimeline,
  buildOpportunityScaffolds,
  buildSelfCritique,
  detectTrendsFromQuery,
  estimateResearchCost,
} from "./profiles";
import { listRecentResearch, persistResearchReport, findRelatedOutcomes } from "./memory";
import type {
  ExecutiveResearchReport,
  ResearchMode,
  ResearchSource,
  SourceQualityScore,
} from "./types";
import { RESEARCH_MODE_META } from "./types";

function emptyQuality(reason: string): SourceQualityScore {
  return {
    authority: 0,
    freshness: 0,
    relevance: 0,
    evidence: 0,
    transparency: 0,
    bias: 0,
    trustworthiness: 0,
    overall: 0,
    reasoning: [reason],
  };
}

function blockedSource(): ResearchSource {
  return {
    id: "connector-blocked",
    title: "Live web search connector",
    publicationDate: null,
    tier: "unknown",
    quality: emptyQuality("Connector not wired — no sources collected"),
    truthKind: "Unknown (More Data Required)",
  };
}

function assembleReport(
  partial: Omit<
    ExecutiveResearchReport,
    | "version"
    | "researchConfidence"
    | "multiSource"
    | "conflicts"
    | "competitive"
    | "trends"
    | "evidenceTimeline"
    | "cost"
    | "opportunities"
    | "selfCritique"
    | "sourceProfiles"
    | "learningFromMemory"
    | "confidence"
    | "confidenceReason"
  > & {
    mode: ResearchMode;
    learningFromMemory?: string[];
    hasInternalData?: boolean;
    hasHistorical?: boolean;
  }
): ExecutiveResearchReport {
  const relevance =
    partial.gate.relevance ?? {
      relevant: true,
      axes: [],
      reason: "Relevance not evaluated",
      ignoredAsNoise: false,
    };
  const sources = partial.supportingSources;
  const conflicts = detectConflicts(sources);
  const trends = detectTrendsFromQuery(partial.query, relevance, partial.gate.connectorAvailable);
  const multiSourceFinal = buildMultiSourceChecklist({
    sources,
    hasInternalData: partial.hasInternalData ?? partial.status === "skipped_internal_sufficient",
    hasHistorical: partial.hasHistorical ?? (partial.learningFromMemory?.length ?? 0) > 0,
    hasTrendSignal: trends.length > 0,
  });

  const researchConfidence = scoreResearchConfidence({
    sources,
    multiSource: multiSourceFinal,
    relevance,
    unknowns: partial.unknowns,
    conflicts: conflicts.length,
    connectorAvailable: partial.gate.connectorAvailable,
  });

  const cost = estimateResearchCost(
    partial.mode,
    partial.status === "completed" || partial.gate.shouldSearch,
    partial.gate.shouldSearch
      ? `${RESEARCH_MODE_META[partial.mode].label} justified by research gate`
      : "Deep modes not justified — gate skipped or blocked search"
  );

  const opportunities = buildOpportunityScaffolds(partial.query, partial.gate.connectorAvailable);
  const selfCritique = buildSelfCritique({
    unknowns: partial.unknowns,
    singleSource: researchConfidence.singleSourceWarning,
    connectorAvailable: partial.gate.connectorAvailable,
    recommendations: partial.recommendations,
  });

  return {
    ...partial,
    version: 2,
    confidence: researchConfidence.label,
    confidenceReason: researchConfidence.why.join(" "),
    researchConfidence,
    multiSource: multiSourceFinal,
    conflicts,
    competitive: buildCompetitiveSection(partial.gate.connectorAvailable),
    trends,
    evidenceTimeline: buildEvidenceTimeline({ query: partial.query, status: partial.status }),
    cost,
    opportunities,
    selfCritique,
    sourceProfiles: SOURCE_PROFILE_CATALOG,
    learningFromMemory: partial.learningFromMemory ?? [],
    agreements: partial.agreements,
    disagreements:
      partial.disagreements.length > 0
        ? partial.disagreements
        : conflicts.flatMap((c) => c.claims.map((x) => `${x.source}: ${x.claim}`)),
  };
}

export async function runExecutiveResearch(input: {
  query: string;
  mode?: ResearchMode;
  internalSufficient?: boolean;
  forceExternal?: boolean;
  persist?: boolean;
  hasInternalData?: boolean;
}): Promise<ExecutiveResearchReport> {
  const mode: ResearchMode = input.mode ?? "executive_brief";
  const gate = await evaluateResearchGate({
    query: input.query,
    internalSufficient: input.internalSufficient,
    forceExternal: input.forceExternal,
  });

  const id = `research-${randomUUID().slice(0, 8)}`;
  const generatedAt = new Date().toISOString();
  const disclaimer = [
    "Web Research Intelligence v2 — evidence quality is scored explicitly.",
    "Verified External Research requires cited sources with dates.",
    "General web is lowest priority after all internal systems.",
    ...RESEARCH_DISCIPLINE.slice(0, 3),
  ].join(" ");

  const learningFromMemory = await findRelatedOutcomes(input.query).catch(() => []);

  if (gate.relevance && !gate.relevance.relevant) {
    const report = assembleReport({
      id,
      generatedAt,
      query: input.query,
      mode,
      category: gate.category,
      gate,
      status: "skipped_not_relevant",
      executiveSummary:
        "Research suppressed by business relevance filter — this signal does not materially affect revenue, bookings, SEO, marketing, client experience, creative quality, or operations.",
      keyDiscoveries: [gate.relevance.reason],
      businessImpact: "Avoids executive noise (e.g. cosmetic social updates).",
      evidence: [{ kind: "AI Analysis", text: gate.relevance.reason }],
      supportingSources: [],
      unknowns: [],
      risks: ["Over-filtering a truly material change — re-query with business impact stated"],
      alternatives: ["Rephrase with explicit business axis (SEO, bookings, revenue, etc.)"],
      recommendations: ["Ignore for now — do not inflate the executive brief"],
      immediateActions: ["No action"],
      actions30d: [],
      longTermStrategy: ["Keep relevance filter tuned with accepted/rejected outcomes"],
      agreements: [],
      disagreements: [],
      disclaimer,
      learningFromMemory,
      hasInternalData: true,
    });
    if (input.persist) await persistResearchReport(report).catch(() => {});
    return report;
  }

  if (!gate.shouldSearch && gate.internalSufficient) {
    const report = assembleReport({
      id,
      generatedAt,
      query: input.query,
      mode: "quick_scan",
      category: gate.category,
      gate,
      status: "skipped_internal_sufficient",
      executiveSummary:
        "No live web search performed. Internal ÉLEVÉ OS knowledge is sufficient — searching would not materially improve the decision.",
      keyDiscoveries: ["Research gate: internal priority satisfied", ...learningFromMemory.slice(0, 2)],
      businessImpact: "Avoids noise and fabricated external certainty.",
      evidence: [
        {
          kind: "Measured Data / Internal",
          text: "Priority order places internal database, CRM, bookings, and analytics above general web.",
        },
      ],
      supportingSources: [],
      unknowns: [],
      risks: [
        "Stale internal knowledge if the topic requires live updates — re-ask with current/latest",
      ],
      alternatives: ["Force external research only when current public information is required"],
      recommendations: ["Answer from CRM, bookings, analytics, portfolio, and knowledge graph first"],
      immediateActions: ["Use internal Command Center data"],
      actions30d: [],
      longTermStrategy: ["Wire live web connector for gated external research when material"],
      agreements: [],
      disagreements: [],
      disclaimer,
      learningFromMemory,
      hasInternalData: true,
      hasHistorical: learningFromMemory.length > 0,
    });
    if (input.persist) await persistResearchReport(report).catch(() => {});
    return report;
  }

  if (!gate.connectorAvailable) {
    const unknowns = [
      "Live source content",
      "Publication dates",
      "Multi-source agreement/disagreement",
      "Official documentation excerpts",
      "Independent analysis corroboration",
    ];
    const report = assembleReport({
      id,
      generatedAt,
      query: input.query,
      mode,
      category: gate.category,
      gate,
      status: "blocked_connector",
      executiveSummary: `${INSUFFICIENT_EVIDENCE_STATEMENT} External research would help (${gate.reason}), but the live web connector is not connected. Confidence is scored low deliberately — no statistics, benchmarks, competitor facts, or ROI were invented.`,
      keyDiscoveries: [
        gate.triggersMatched.length
          ? `Triggers: ${gate.triggersMatched.slice(0, 3).join("; ")}`
          : "Material external topic detected",
        "Live web search connector status: planned / not wired",
        ...learningFromMemory.slice(0, 1),
      ],
      businessImpact:
        "Recommendations that depend on live external evidence must wait — do not treat Industry Best Practice guesses as Verified External Research.",
      evidence: [
        { kind: "Unknown (More Data Required)", text: "No verified external sources collected" },
        { kind: "AI Analysis", text: gate.reason },
      ],
      supportingSources: [blockedSource()],
      unknowns,
      risks: [
        "Acting on invented industry averages would violate research discipline",
        "Competitor claims without public citations are forbidden",
      ],
      alternatives: [
        "Use internal measured analytics and CRM",
        "Defer until connector is wired or human attaches verified sources",
      ],
      recommendations: [
        INSUFFICIENT_EVIDENCE_STATEMENT,
        "Do not fabricate benchmarks while waiting for research capacity",
      ],
      immediateActions: [
        "Proceed with internal measured data only",
        "Flag decision as research-blocked in the executive brief",
      ],
      actions30d: [
        "Connect and verify live web search connector",
        "Enable continuous monitor for ÉLEVÉ-material updates only",
      ],
      longTermStrategy: [
        "Store verified findings in research memory after connector is live",
        "Learn from accepted/rejected research-backed recommendations and outcomes",
      ],
      agreements: [],
      disagreements: [],
      disclaimer,
      learningFromMemory,
      hasInternalData: input.hasInternalData ?? true,
      hasHistorical: learningFromMemory.length > 0,
    });
    if (input.persist) await persistResearchReport(report).catch(() => {});
    return report;
  }

  const report = assembleReport({
    id,
    generatedAt,
    query: input.query,
    mode,
    category: gate.category,
    gate,
    status: "insufficient_evidence",
    executiveSummary: `${INSUFFICIENT_EVIDENCE_STATEMENT} Connector reports available but multi-source fetch runner is not implemented — refusing to invent results. Confidence remains low by design.`,
    keyDiscoveries: ["Connector marked available; fetch pipeline not implemented"],
    businessImpact: "Protects trust — empty research is better than fabricated certainty.",
    evidence: [
      { kind: "Unknown (More Data Required)", text: "Multi-source collection step not executed" },
    ],
    supportingSources: [],
    unknowns: ["All external claims"],
    risks: ["False confidence if placeholder content were invented"],
    alternatives: ["Manual attach of official docs by operator"],
    recommendations: [INSUFFICIENT_EVIDENCE_STATEMENT],
    immediateActions: ["Use internal data", "Attach official documentation manually if needed"],
    actions30d: ["Implement multi-source fetch + quality scoring runner"],
    longTermStrategy: ["Continuous intelligence monitor with materiality filter"],
    agreements: [],
    disagreements: [],
    disclaimer,
    learningFromMemory,
    hasInternalData: true,
  });
  if (input.persist) await persistResearchReport(report).catch(() => {});
  return report;
}

export function formatResearchReportForPrompt(report: ExecutiveResearchReport): string {
  return [
    "=== WEB RESEARCH INTELLIGENCE v2 ===",
    `Mode: ${report.mode} · Status: ${report.status}`,
    `Gate: ${report.gate.reason}`,
    `Research Confidence: ${report.researchConfidence.overall}% (${report.researchConfidence.label})`,
    ...report.researchConfidence.why.map((w) => `  - ${w}`),
    report.multiSource.warning ? `Multi-source warning: ${report.multiSource.warning}` : null,
    `Summary: ${report.executiveSummary}`,
    report.conflicts.length
      ? `Conflicts: ${report.conflicts.map((c) => c.recommendation).join(" | ")}`
      : null,
    report.selfCritique.verifyBeforeExecution[0]
      ? `Verify before execution: ${report.selfCritique.verifyBeforeExecution[0]}`
      : null,
    `Disclaimer: ${report.disclaimer}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export { listRecentResearch };
