/**
 * ÉLEVÉ AI Platform Charter — foundational types and engines.
 * Every subsystem should import from here for truth, recommendations, graph, events, connectors.
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

export const PLATFORM_CHARTER = {
  principles: [
    "Truth Layer — nothing authoritative without evidence metadata",
    "Knowledge Graph — everything is an object with typed relationships",
    "Verification Engine — continuous verification, flag contradictions",
    "External Intelligence — connectors expose health; never invent data when disconnected",
    "Recommendation Engine — decision-grade recommendations with ROI ranking",
    "Executive Simulator — scenarios with assumptions and confidence intervals",
    "Continuous Learning — every business event improves intelligence",
  ],
  trustLabels: ["verified", "calculated", "estimated", "predicted", "unknown"] as const,
  ceoStandard:
    "Would the CEO of a billion-dollar company trust this to make real business decisions?",
} as const;
