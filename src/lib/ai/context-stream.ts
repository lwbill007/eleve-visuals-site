import {
  AI_WORKFLOW_MODES,
  type AIWorkflowMode,
} from "@/lib/ai/prompts/workflows";

export type AIContextStreamEvent =
  | { type: "mode"; mode: AIWorkflowMode; label: string }
  | { type: "text"; text: string }
  | { type: "error"; error: string };

const WORKFLOW_MODE_SET = new Set<string>(AI_WORKFLOW_MODES);

export function parseContextStreamPayload(
  value: unknown
): AIContextStreamEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;

  if (
    typeof payload.mode === "string" &&
    WORKFLOW_MODE_SET.has(payload.mode) &&
    typeof payload.label === "string" &&
    payload.label.trim().length > 0 &&
    payload.label.length <= 64
  ) {
    return {
      type: "mode",
      mode: payload.mode as AIWorkflowMode,
      label: payload.label.trim(),
    };
  }

  if (typeof payload.text === "string" && payload.text.length > 0) {
    return { type: "text", text: payload.text };
  }

  if (typeof payload.error === "string" && payload.error.length > 0) {
    return { type: "error", error: payload.error };
  }

  return null;
}
