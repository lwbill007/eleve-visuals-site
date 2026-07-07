import { getWorkspaceId } from "./workspace";

/**
 * Assumption-based learning is disabled for production readiness.
 * Outcomes are recorded only via mission completion and recommendation feedback.
 */
export async function runLearningPass(): Promise<{ recorded: number }> {
  void getWorkspaceId();
  return { recorded: 0 };
}
