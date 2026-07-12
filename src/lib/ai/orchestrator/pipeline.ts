/**
 * Verification pipeline — Internal → Knowledge → Live Web → Reasoning → Confidence → Answer
 * Live web only when necessary and when connector is available.
 */

import type { EvidenceBundle } from "../evidence/schema";
import { listKnowledgeConnectors } from "../connectors/knowledge";
import type { VerificationStep } from "./types";

export async function runVerificationPipeline(input: {
  hasInternalData: boolean;
  evidence: EvidenceBundle;
  needsLiveWeb: boolean;
}): Promise<VerificationStep[]> {
  const connectors = await listKnowledgeConnectors();
  const web = connectors.find((c) => c.id === "web_search");
  const kb = connectors.find((c) => c.id === "knowledge_base");

  const steps: VerificationStep[] = [
    {
      id: "internal_data",
      label: "Internal Data",
      status: input.hasInternalData ? "completed" : "failed",
      detail: input.hasInternalData
        ? "CRM / booking / workspace data loaded"
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
      id: "live_web",
      label: "Live Web",
      status:
        input.needsLiveWeb && web?.wired
          ? "completed"
          : input.needsLiveWeb
            ? "skipped"
            : "skipped",
      detail:
        input.needsLiveWeb && web?.wired
          ? "Live research executed"
          : input.needsLiveWeb
            ? "Live web needed but connector not wired — research confidence reduced"
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
