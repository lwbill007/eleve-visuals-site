/**
 * Specialized Prompt Stack — layered, maintainable agent prompts.
 *
 * Layer 1 Global Charter
 * Layer 2 Agent Role
 * Layer 3 Current Workspace
 * Layer 4 User Context
 * Layer 5 Task Instructions
 * Layer 6 Output Schema
 */

import { charterResponseStructure, masterSystemPrompt, type CONTEXT_FOCUS } from "../executive/charter";
import { formatEvidenceForPrompt, type EvidenceBundle } from "../evidence/schema";

export type PromptSurface = keyof typeof CONTEXT_FOCUS;

export interface PromptAgentIdentity {
  title: string;
  specialty: string;
}

export interface PromptStackInput {
  agent: PromptAgentIdentity;
  surface?: PromptSurface;
  workspaceNotes?: string;
  userContext?: string;
  task: string;
  outputSchema?: string;
  evidence?: EvidenceBundle;
  toolNames?: string[];
}

export function buildLayeredSystemPrompt(input: PromptStackInput): string {
  const layers: string[] = [];

  layers.push(`=== LAYER 1 · GLOBAL CHARTER ===\n${masterSystemPrompt()}`);

  layers.push(
    `=== LAYER 2 · AGENT ROLE ===\nYou are ${input.agent.title}.\nSpecialty: ${input.agent.specialty}\nOperate strictly within this mandate. Collaborate with peer agents but do not invent outside your domain.`
  );

  if (input.surface || input.workspaceNotes) {
    layers.push(
      [
        "=== LAYER 3 · CURRENT WORKSPACE ===",
        input.surface ? `Surface: ${input.surface}` : null,
        input.workspaceNotes || null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  if (input.userContext || input.evidence) {
    layers.push(
      [
        "=== LAYER 4 · USER / CASE CONTEXT ===",
        input.userContext || null,
        input.evidence ? formatEvidenceForPrompt(input.evidence) : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  layers.push(`=== LAYER 5 · TASK INSTRUCTIONS ===\n${input.task}`);

  if (input.toolNames?.length) {
    layers.push(
      `Available tools for this agent: ${input.toolNames.join(", ")}. Prefer tools over speculation.`
    );
  }

  layers.push(
    [
      "=== LAYER 6 · OUTPUT SCHEMA ===",
      input.outputSchema || defaultOutputSchema(),
      "",
      charterResponseStructure(),
    ].join("\n")
  );

  return layers.join("\n\n");
}

function defaultOutputSchema(): string {
  return `Return structured executive output with:
1. Recommendation (concise)
2. Confidence breakdown (creative / business / research / production / sales / overall)
3. Evidence bullets (✓ / ~ / ✗)
4. Source types used
5. Risks / trade-offs
6. Recommended actions (approval-gated if sensitive)
Never invent evidence. Label estimates clearly.`;
}

/** Lightweight stack for non-chat task generation (no full agent specialty dump). */
export function buildTaskPromptStack(opts: {
  task: string;
  surface?: PromptSurface;
  context?: string;
  outputSchema?: string;
}): string {
  return [
    `=== LAYER 1 · GLOBAL CHARTER ===\n${masterSystemPrompt()}`,
    opts.surface
      ? `=== LAYER 3 · WORKSPACE ===\nSurface: ${opts.surface}`
      : null,
    opts.context ? `=== LAYER 4 · CONTEXT ===\n${opts.context}` : null,
    `=== LAYER 5 · TASK ===\n${opts.task}`,
    `=== LAYER 6 · OUTPUT ===\n${opts.outputSchema || defaultOutputSchema()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
