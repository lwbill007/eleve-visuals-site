/**
 * ÉLEVÉ AI Operating System — non-negotiable principles + Definition of Done.
 * Architecture-first: map before modify. Evidence-first. Backward compatible. Observable.
 */

/** Layer map — every new feature must declare which layer it belongs to. */
export const AI_OS_LAYERS = {
  1: {
    id: "data",
    label: "Data",
    owns: ["Analytics", "Bookings", "Payments", "CRM", "Website"],
  },
  2: {
    id: "knowledge",
    label: "Knowledge",
    owns: ["Business Brain", "Memory", "Knowledge Graph"],
  },
  3: {
    id: "reasoning",
    label: "Reasoning",
    owns: [
      "Decision Engine",
      "Prediction Engine",
      "Opportunity Engine",
      "Risk Engine",
      "Simulation Engine",
    ],
  },
  4: {
    id: "execution",
    label: "Execution",
    owns: ["Dashboard", "Briefing", "Automation", "Notifications", "Tasks"],
  },
  5: {
    id: "learning",
    label: "Learning",
    owns: [
      "Outcome Verification",
      "Model Evaluation",
      "Business Rule Updates",
      "Continuous Improvement",
    ],
  },
} as const;

/** Provider → Business Brain dependency chain. Identify duplicates before editing. */
export const AI_ARCHITECTURE_MAP = [
  "Providers",
  "Router",
  "Task Registry",
  "Prompt Templates",
  "Evaluation Services",
  "Structured Output Layer",
  "Retry Layer",
  "Persistence",
  "Business Brain",
] as const;

export const AI_OS_PRINCIPLES = [
  {
    id: "architecture_first",
    label: "Architecture-first",
    rule: "Inspect and map the current system before changing anything.",
  },
  {
    id: "evidence_first",
    label: "Evidence-first",
    rule: "Recommendations must be backed by measurable data or clearly labeled as estimates.",
  },
  {
    id: "backward_compatibility",
    label: "Backward compatibility",
    rule: "Preserve APIs, schemas, and working behavior unless a breaking change is explicitly justified.",
  },
  {
    id: "observability",
    label: "Observability",
    rule: "Every AI decision, model selection, fallback, retry, and prediction must be traceable through telemetry.",
  },
] as const;

/** Upgrade is complete only if all of these hold. */
export const AI_DEFINITION_OF_DONE = [
  "Existing endpoints continue to function.",
  "Existing database migrations are unnecessary unless explicitly required.",
  "AI evaluation accuracy is maintained or improved.",
  "No existing dashboard features regress.",
  "AI routing is centralized behind one router.",
  "All model failures recover automatically.",
  "Every AI request produces structured telemetry.",
  "Every recommendation remains evidence-backed.",
  "Unknown data never becomes fabricated data.",
] as const;

/**
 * Learning loop — no manual intervention required for rule updates once outcomes verify.
 * Recommendation → Decision → Outcome → Verification → Business Rule Update → Future Recommendations
 */
export const AI_LEARNING_LOOP = [
  "recommendation",
  "decision",
  "outcome",
  "verification",
  "business_rule_update",
  "future_recommendations",
] as const;

export type AIOsLayerId = (typeof AI_OS_LAYERS)[keyof typeof AI_OS_LAYERS]["id"];
