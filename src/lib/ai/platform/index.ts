/**
 * ÉLEVÉ AI Platform Charter — foundational types and engines.
 * Every subsystem should import from here for truth, recommendations, graph, events, connectors.
 *
 * Master intelligence principles live in `../executive/charter` (single source of truth).
 */

export * from "./truth-metadata";
export * from "./truth-resolver";
export * from "./recommendation-contract";
export * from "./graph-ontology";
export * from "./graph-query";
export * from "./business-events";
export * from "./connectors";
export * from "./verification-engine";
export * from "./event-graph";
export * from "./executive-context";

import {
  APPROVAL_GATES,
  OPERATING_PRINCIPLES,
  PLATFORM_INTELLIGENCE_CHARTER,
  PLATFORM_NAME,
  TRUTH_LABELS,
} from "../executive/charter";

export const PLATFORM_CHARTER = {
  name: PLATFORM_NAME,
  principles: [
    ...PLATFORM_INTELLIGENCE_CHARTER.principles.slice(0, 4),
    "Truth Layer — nothing authoritative without evidence metadata",
    "Knowledge Graph — everything is an object with typed relationships",
    "Verification Engine — continuous verification, flag contradictions",
    "External Intelligence — connectors expose health; never invent data when disconnected",
    "Recommendation Engine — decision-grade recommendations with ROI ranking",
    "Continuous Learning — every business event improves intelligence incrementally",
  ],
  operatingPrinciples: OPERATING_PRINCIPLES,
  trustLabels: ["verified", "calculated", "estimated", "predicted", "unknown"] as const,
  truthPresentation: TRUTH_LABELS,
  approvalGates: APPROVAL_GATES,
  ceoStandard:
    "Would the CEO of a billion-dollar company trust this to make real business decisions?",
  intelligence: PLATFORM_INTELLIGENCE_CHARTER,
} as const;
