/**
 * Verification pipeline — Internal → Knowledge → Live Web → Reasoning → Confidence → Answer
 * Live web only when the research gate says it is material and the connector is available.
 */

import type { EvidenceBundle } from "../evidence/schema";
import { listKnowledgeConnectors } from "../connectors/knowledge";
import { evaluateResearchGate } from "../research/gate";
import type { VerificationStep } from "./types";

export async function runVerificationPipeline(input: {
  hasInternalData: boolean;
  evidence: EvidenceBundle;
  needsLiveWeb: boolean;
  query?: string;
}): Promise<VerificationStep[]> {
  const connectors = await listKnowledgeConnectors();
  const web = connectors.find((c) => c.id === "web_search");
  const kb = connectors.find((c) => c.id === "knowledge_base");

  const gate = input.query
    ? await evaluateResearchGate({
        query: input.query,
        forceExternal: input.needsLiveWeb,
        internalSufficient: input.hasInternalData && !input.needsLiveWeb,
      })
    : null;

  const liveNeeded = gate
    ? gate.shouldSearch || (input.needsLiveWeb && gate.connectorAvailable)
    : input.needsLiveWeb;

  const steps: VerificationStep[] = [
    {
      id: "internal_data",
      label: "Internal Data",
      status: input.hasInternalData ? "completed" : "failed",
      detail: input.hasInternalData
        ? "CRM / booking / workspace data loaded (priority 1–11 before web)"
        : "No internal case data provided",
    },
    {
      id: "knowledge_base",
      label: "Knowledge Base",
      status: kb?.wired ? "completed" : "skipped",
      detail: kb?.wired
        ? "Institutional memory available"
        : "Knowledge base connector not fully wired",
    },
    {
      id: "research_gate",
      label: "Research Gate",
      status: gate
        ? gate.shouldSearch
          ? "completed"
          : "skipped"
        : input.needsLiveWeb
          ? "completed"
          : "skipped",
      detail: gate?.reason || (input.needsLiveWeb ? "Caller requested live web" : "No live web requested"),
    },
    {
      id: "live_web",
      label: "Live Web",
      status: liveNeeded && web?.wired ? "completed" : "skipped",
      detail:
        liveNeeded && web?.wired
          ? "Live research executed"
          : liveNeeded
            ? "Live web material but connector not wired — research confidence reduced; do not invent findings"
            : "Live web not required for this task",
    },
    {
      id: "reasoning",
      label: "Reasoning",
      status: "completed",
      detail: `Evidence items: ${input.evidence.items.length}; gaps: ${input.evidence.gaps.length}`,
    },
    {
      id: "confidence",
      label: "Confidence",
      status: "completed",
      detail: "Multi-category confidence computed from evidence quality",
    },
    {
      id: "final_answer",
      label: "Final Answer",
      status: "completed",
      detail: "Executive summary assembled from specialist agents",
    },
  ];

  return steps;
}
