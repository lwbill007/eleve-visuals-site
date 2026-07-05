"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { MemoryGraphVisual } from "@/components/admin/ai/MemoryGraphVisual";
import { MemoryHeatmap } from "@/components/admin/ai/MemoryHeatmap";
import { MEMORY_LAYERS, type MemoryLayer, type MemoryRecord } from "@/lib/ai/memory/types";
import { cn } from "@/lib/utils";

interface MemoryStats {
  total: number;
  pinned: number;
  verified: number;
  byLayer: Record<string, number>;
}

interface GraphData {
  nodes: { id: string; label: string; layer: MemoryLayer; category: string }[];
  edges: { id: string; from: string; to: string; relationType: string; weight: number }[];
}

interface HeatmapData {
  weeks: string[];
  layers: { id: MemoryLayer; label: string }[];
  values: Record<MemoryLayer, number[]>;
  max: number;
}

const layerColors: Record<MemoryLayer, string> = {
  business: "text-accent border-accent/30",
  crm: "text-cream border-cream/20",
  brand: "text-amber-300 border-amber-500/30",
  creative: "text-purple-300 border-purple-500/30",
  marketing: "text-green-400 border-green-500/30",
  financial: "text-emerald-300 border-emerald-500/30",
  sessions: "text-pink-300 border-pink-500/30",
  sponsor: "text-blue-300 border-blue-500/30",
  operational: "text-fog border-stone/30",
};

export function MemoryCenterClient() {
  useSetAIPage("memory");
  const [items, setItems] = useState<MemoryRecord[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [layer, setLayer] = useState<MemoryLayer | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<MemoryRecord | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (layer !== "all") params.set("layer", layer);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "60");

      const [listRes, statsRes, graphRes, heatmapRes] = await Promise.all([
        adminFetch(`/api/admin/ai/memory?${params}`),
        adminFetch("/api/admin/ai/memory?view=stats"),
        adminFetch(`/api/admin/ai/memory/graph${layer !== "all" ? `?layer=${layer}` : ""}`),
        adminFetch("/api/admin/ai/memory?view=heatmap"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setItems(data.items ?? []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (graphRes.ok) setGraph(await graphRes.json());
      if (heatmapRes.ok) setHeatmap(await heatmapRes.json());
    } finally {
      setLoading(false);
    }
  }, [layer, query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  async function syncMemories() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/ai/memory/sync", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? "Sync complete.");
      await load();
    } catch {
      setMessage("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function patchMemory(id: string, patch: Record<string, unknown>) {
    await adminFetch(`/api/admin/ai/memory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Intelligence Layer"
          title="Memory Center"
          description="Structured business knowledge — auditable, searchable, and used before every AI recommendation. Not chat history."
        />
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncMemories()}
          className="rounded-xl bg-cream px-5 py-3 text-xs tracking-[0.12em] text-ink uppercase transition-colors hover:bg-accent disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync from business data"}
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-cream">{message}</p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Total memories" value={stats.total} />
          <StatCard label="Verified" value={stats.verified} />
          <StatCard label="Pinned" value={stats.pinned} />
          {MEMORY_LAYERS.slice(0, 3).map((l) => (
            <StatCard key={l.id} label={l.label} value={stats.byLayer[l.id] ?? 0} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={layer === "all"} onClick={() => setLayer("all")} label="All layers" />
          {MEMORY_LAYERS.map((l) => (
            <FilterChip
              key={l.id}
              active={layer === l.id}
              onClick={() => setLayer(l.id)}
              label={l.label}
              count={stats?.byLayer[l.id]}
            />
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
          className="w-full max-w-md rounded-xl border border-stone/25 bg-charcoal/20 px-4 py-3 text-sm text-cream placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {heatmap && (
        <AdminPanel title="Memory heatmap" subtitle="Knowledge activity by layer over the last 8 weeks">
          <MemoryHeatmap data={heatmap} />
        </AdminPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <AdminPanel title="Memory timeline" subtitle="Most recent structured knowledge" className="lg:col-span-7">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-stone/15" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-cream">No memories yet.</p>
              <p className="mt-2 text-sm text-muted">
                Run <strong className="text-accent">Sync from business data</strong> to build your executive knowledge base.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all hover:border-accent/35 hover:bg-charcoal/25",
                      layerColors[m.layer],
                      selected?.id === m.id && "border-accent/50 bg-accent/5"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[0.6rem] tracking-[0.12em] uppercase opacity-70">
                          {m.layer} · {m.category}
                          {m.pinned && " · pinned"}
                          {m.verified && " · verified"}
                        </p>
                        <p className="mt-1 font-medium text-cream">{m.title || m.key}</p>
                        {m.summary && <p className="mt-1 line-clamp-2 text-xs text-fog">{m.summary}</p>}
                      </div>
                      <div className="text-right text-[0.65rem] text-muted">
                        <p>{Math.round(m.confidence * 100)}% conf</p>
                        <p>{new Date(m.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <div className="space-y-4 lg:col-span-5">
          {selected ? (
            <AdminPanel title="Memory detail" subtitle="Source, confidence, and actions">
              <MemoryDetail memory={selected} onAction={(patch) => void patchMemory(selected.id, patch)} />
            </AdminPanel>
          ) : (
            <AdminPanel title="Select a memory" subtitle="View source, confidence, and audit trail">
              <p className="text-sm text-muted">
                Every AI insight cites structured memories like these. Nothing is hidden — pin, verify, archive, or correct any entry.
              </p>
            </AdminPanel>
          )}

          <AdminPanel title="Knowledge graph" subtitle={`${graph?.nodes.length ?? 0} nodes · ${graph?.edges.length ?? 0} connections`}>
            <MemoryGraphVisual data={graph} />
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="os-panel rounded-xl p-4 text-center">
      <p className="font-display text-2xl text-cream">{value}</p>
      <p className="mt-1 text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[0.65rem] tracking-[0.1em] uppercase transition-colors",
        active ? "border-accent bg-accent/10 text-accent" : "border-stone/25 text-muted hover:border-stone/40 hover:text-cream"
      )}
    >
      {label}
      {count !== undefined ? ` (${count})` : ""}
    </button>
  );
}

function MemoryDetail({
  memory,
  onAction,
}: {
  memory: MemoryRecord;
  onAction: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
          {memory.layer} · {memory.category} · source: {memory.source}
        </p>
        <h3 className="mt-2 font-display text-xl text-cream">{memory.title}</h3>
        {memory.summary && <p className="mt-2 text-sm text-fog">{memory.summary}</p>}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-stone/25 px-2.5 py-1 text-muted">
          Confidence {Math.round(memory.confidence * 100)}%
        </span>
        <span className="rounded-full border border-stone/25 px-2.5 py-1 text-muted">
          Importance {memory.importance}
        </span>
        <span className="rounded-full border border-stone/25 px-2.5 py-1 text-muted">
          Updated {new Date(memory.updatedAt).toLocaleString()}
        </span>
      </div>

      <pre className="max-h-40 overflow-auto rounded-lg border border-stone/20 bg-ink/50 p-3 text-[0.65rem] text-fog">
        {JSON.stringify(memory.value, null, 2)}
      </pre>

      <div className="flex flex-wrap gap-2">
        <ActionBtn label={memory.pinned ? "Unpin" : "Pin"} onClick={() => onAction({ pinned: !memory.pinned })} />
        <ActionBtn label={memory.verified ? "Unverify" : "Verify"} onClick={() => onAction({ verified: !memory.verified })} />
        <ActionBtn label="Archive" onClick={() => onAction({ archived: true })} />
        <ActionBtn label="Delete" danger onClick={() => onAction({ action: "delete" })} />
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-[0.65rem] tracking-[0.08em] uppercase transition-colors",
        danger
          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
          : "border-stone/25 text-fog hover:border-accent hover:text-accent"
      )}
    >
      {label}
    </button>
  );
}
