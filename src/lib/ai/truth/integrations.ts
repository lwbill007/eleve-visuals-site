import type { GraphHealth } from "./types";

export function computeGraphHealth(nodes: number, edges: number): GraphHealth {
  const targetEdges = Math.max(500, Math.round(nodes * 0.5));
  const density = nodes > 0 ? edges / nodes : 0;
  const edgeProgress = Math.min(1, edges / targetEdges);
  const healthScore = Math.round(edgeProgress * 100);

  let status: GraphHealth["status"] = "healthy";
  if (healthScore < 30) status = "critical";
  else if (healthScore < 70) status = "under_connected";

  return {
    nodes,
    edges,
    density: Math.round(density * 100) / 100,
    targetEdges,
    healthScore,
    status,
    explanation:
      status === "healthy"
        ? `${edges} relationships across ${nodes} knowledge objects — graph supports traceability`
        : status === "under_connected"
          ? `Only ${edges} edges for ${nodes} nodes (target ${targetEdges}). Run Refresh Executive Intelligence to strengthen links.`
          : `Critical: ${edges} edges for ${nodes} memories — recommendations lack relationship evidence`,
    recentLinks: [],
  };
}
