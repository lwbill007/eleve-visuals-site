"use client";

import type { MemoryLayer } from "@/lib/ai/memory/types";

interface GraphData {
  nodes: { id: string; label: string; layer: MemoryLayer; category: string }[];
  edges: { id: string; from: string; to: string; relationType: string; weight: number }[];
}

const layerDot: Record<MemoryLayer, string> = {
  business: "#c9a962",
  crm: "#f5f0e8",
  brand: "#fbbf24",
  creative: "#c084fc",
  marketing: "#4ade80",
  financial: "#34d399",
  sessions: "#f472b6",
  sponsor: "#60a5fa",
  operational: "#78716c",
};

export function MemoryGraphVisual({ data }: { data: GraphData | null }) {
  if (!data || data.nodes.length === 0) {
    return <p className="text-sm text-muted">Sync memories to visualize relationships between clients, campaigns, and revenue.</p>;
  }

  const size = 320;
  const center = size / 2;
  const radius = size * 0.38;
  const positions = new Map<string, { x: number; y: number }>();

  data.nodes.forEach((node, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    });
  });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Knowledge graph">
        {data.edges.slice(0, 24).map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(201,169,98,0.25)"
              strokeWidth={Math.min(3, 0.5 + edge.weight * 0.5)}
            />
          );
        })}
        {data.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <g key={node.id}>
              <circle cx={pos.x} cy={pos.y} r={8} fill={layerDot[node.layer]} opacity={0.9} />
              <title>{`${node.label} (${node.layer})`}</title>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {([...new Set(data.nodes.map((n) => n.layer))] as MemoryLayer[]).map((layer) => (
          <span key={layer} className="flex items-center gap-1.5 text-[0.6rem] text-muted uppercase">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: layerDot[layer] }} />
            {layer}
          </span>
        ))}
      </div>
    </div>
  );
}
