"use client";

import type { MemoryLayer } from "@/lib/ai/memory/types";

interface HeatmapData {
  weeks: string[];
  layers: { id: MemoryLayer; label: string }[];
  values: Record<MemoryLayer, number[]>;
  max: number;
}

export function MemoryHeatmap({ data }: { data: HeatmapData | null }) {
  if (!data) {
    return <p className="text-sm text-muted">Loading activity heatmap…</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-2 grid grid-cols-[120px_repeat(8,minmax(0,1fr))] gap-1 text-[0.55rem] tracking-[0.08em] text-muted uppercase">
          <div />
          {data.weeks.map((w) => (
            <div key={w} className="text-center">
              {w}
            </div>
          ))}
        </div>
        {data.layers.map((layer) => (
          <div key={layer.id} className="mb-1 grid grid-cols-[120px_repeat(8,minmax(0,1fr))] gap-1 items-center">
            <div className="truncate text-xs text-fog">{layer.label}</div>
            {(data.values[layer.id] ?? []).map((v, i) => {
              const intensity = data.max > 0 ? v / data.max : 0;
              return (
                <div
                  key={`${layer.id}-${i}`}
                  title={`${layer.label} · ${data.weeks[i]} · activity ${v}`}
                  className="aspect-square rounded-sm border border-stone/10"
                  style={{
                    backgroundColor: `rgba(201, 169, 98, ${0.08 + intensity * 0.72})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.65rem] text-muted">Darker gold = more memory updates & higher importance in that week</p>
    </div>
  );
}
