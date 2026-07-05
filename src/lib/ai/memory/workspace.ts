/** Multi-workspace foundation — one env var scales to multiple businesses later */
export function getWorkspaceId(): string {
  return process.env.WORKSPACE_ID?.trim() || "default";
}

export function getWorkspaceMeta() {
  return {
    id: getWorkspaceId(),
    name: process.env.WORKSPACE_NAME?.trim() || "ÉLEVÉ Visuals",
    multimodal: process.env.AI_MULTIMODAL === "1",
  };
}
