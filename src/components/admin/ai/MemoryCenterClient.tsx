"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { MemoryGraphVisual } from "@/components/admin/ai/MemoryGraphVisual";
import { MemoryHeatmap } from "@/components/admin/ai/MemoryHeatmap";
import { MEMORY_LAYERS, type MemoryLayer, type MemoryRecord } from "@/lib/ai/memory/types";
import type { LearningTimelineEvent, MemoryExplanation, RefreshLearnReport, RefreshTrigger } from "@/lib/ai/memory/knowledge/types";
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
  const [timeline, setTimeline] = useState<LearningTimelineEvent[]>([]);
  const [layer, setLayer] = useState<MemoryLayer | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<MemoryRecord | null>(null);
  const [explanation, setExplanation] = useState<MemoryExplanation | null>(null);
  const [lastReport, setLastReport] = useState<RefreshLearnReport | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LearningTimelineEvent | null>(null);
  const [message, setMessage] = useState("");
  const [automationOptions, setAutomationOptions] = useState<
    { id: RefreshTrigger; label: string; available: boolean; enabled: boolean }[]
  >([]);
  const [automationSaving, setAutomationSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (layer !== "all") params.set("layer", layer);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "60");

      const [listRes, statsRes, graphRes, heatmapRes, timelineRes] = await Promise.all([
        adminFetch(`/api/admin/ai/memory?${params}`),
        adminFetch("/api/admin/ai/memory?view=stats"),
        adminFetch(`/api/admin/ai/memory/graph${layer !== "all" ? `?layer=${layer}` : ""}`),
        adminFetch("/api/admin/ai/memory?view=heatmap"),
        adminFetch("/api/admin/ai/memory/learn-timeline?limit=30"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setItems(data.items ?? []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (graphRes.ok) setGraph(await graphRes.json());
      if (heatmapRes.ok) setHeatmap(await heatmapRes.json());
      if (timelineRes.ok) {
        const t = await timelineRes.json();
        setTimeline(t.events ?? []);
      }

      const autoRes = await adminFetch("/api/admin/ai/memory/automation");
      if (autoRes.ok) {
        const auto = await autoRes.json();
        setAutomationOptions(auto.options ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [layer, query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  async function refreshIntelligence() {
    setRefreshing(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/ai/memory/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setLastReport(data.report);
      setMessage(
        data.message ??
          `Intelligence refreshed · health ${data.report?.executiveReport?.overallHealthScore ?? "—"}/100`
      );
      await load();
    } catch {
      setMessage("Intelligence refresh failed — check server logs.");
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleAutomation(id: RefreshTrigger, enabled: boolean) {
    setAutomationSaving(true);
    try {
      const current = automationOptions.filter((o) => o.enabled).map((o) => o.id);
      let schedules: RefreshTrigger[];
      if (id === "manual" && !enabled) {
        schedules = current.filter((s) => s !== "manual");
      } else if (enabled) {
        schedules = [...new Set([...current.filter((s) => s !== "manual" || id === "manual"), id])];
        if (id !== "manual") schedules = schedules.filter((s) => s !== "manual");
      } else {
        schedules = current.filter((s) => s !== id);
        if (schedules.length === 0) schedules = ["manual"];
      }

      const res = await adminFetch("/api/admin/ai/memory/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, schedules }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutomationOptions(data.options ?? []);
      }
    } finally {
      setAutomationSaving(false);
    }
  }

  async function syncMemories() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/ai/memory/sync", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? "Metrics sync complete.");
      await load();
    } catch {
      setMessage("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function loadExplanation(memoryId: string) {
    const res = await adminFetch(`/api/admin/ai/memory/${memoryId}/explain`);
    if (res.ok) setExplanation(await res.json());
  }

  async function patchMemory(id: string, patch: Record<string, unknown>) {
    if (patch.action === "delete") {
      await adminFetch(`/api/admin/ai/memory/${id}`, { method: "DELETE" });
    } else {
      await adminFetch(`/api/admin/ai/memory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }
    await load();
    if (selected?.id === id) {
      setSelected(null);
      setExplanation(null);
    }
  }

  useEffect(() => {
    if (selected) void loadExplanation(selected.id);
    else setExplanation(null);
  }, [selected?.id]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Chief Intelligence Officer"
        title="Business Knowledge Engine"
        description="ÉLEVÉ AI's operating system — discovers every route automatically, builds semantic understanding, detects changes, and generates executive intelligence. Nothing overwrites history; everything evolves."
      />

      <section className="os-glass rounded-2xl border border-accent/30 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="label-caps text-accent">Intelligence refresh</p>
            <p className="mt-2 max-w-xl text-sm text-fog">
              Crawl the entire platform via router discovery — every page, volume, portfolio project, admin module,
              and business surface. Compare against prior scans. Build the knowledge graph.
            </p>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshIntelligence()}
            className="w-full min-w-[220px] rounded-2xl bg-cream px-10 py-5 text-sm font-medium tracking-[0.14em] text-ink uppercase shadow-lg shadow-accent/10 transition-all hover:bg-accent hover:shadow-accent/20 disabled:opacity-50 sm:w-auto"
          >
            {refreshing ? "Crawling platform…" : "Refresh Intelligence"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncMemories()}
            className="rounded-xl border border-stone/30 px-4 py-2 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:border-accent disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync metrics"}
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              const res = await adminFetch("/api/admin/ai/embeddings/reindex", { method: "POST" });
              const data = res.ok ? await res.json() : null;
              setMessage(
                data
                  ? `Semantic index updated — ${data.chunks} chunks across ${data.indexed} memories.`
                  : "Embedding reindex failed."
              );
              setSyncing(false);
            }}
            className="rounded-xl border border-stone/30 px-4 py-2 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:border-accent disabled:opacity-50"
          >
            Reindex embeddings
          </button>
        </div>
      </section>

      {message && (
        <p className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-cream">{message}</p>
      )}

      {lastReport && (
        <RefreshReportPanel report={lastReport} onDismiss={() => setLastReport(null)} />
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

      <AdminPanel title="Learning timeline" subtitle="Every refresh, memory change, and verified learning event">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted">Run Refresh Intelligence to start building your timeline.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {timeline.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(e)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:border-accent/35",
                      selectedEvent?.id === e.id ? "border-accent/50 bg-accent/5" : "border-stone/20"
                    )}
                  >
                    <p className="text-[0.6rem] text-muted uppercase">
                      {new Date(e.date).toLocaleDateString()} · {e.category}
                      {e.verified && " · verified"}
                    </p>
                    <p className="mt-1 text-sm text-cream">{e.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-fog">{e.detail}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-stone/20 p-4">
              {selectedEvent ? (
                <EventDetail event={selectedEvent} />
              ) : (
                <p className="text-sm text-muted">Select an event to see what changed.</p>
              )}
            </div>
          </div>
        )}
      </AdminPanel>

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
          placeholder="Search knowledge base…"
          className="w-full max-w-md rounded-xl border border-stone/25 bg-charcoal/20 px-4 py-3 text-sm text-cream placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {heatmap && (
        <AdminPanel title="Knowledge activity" subtitle="Memory updates by layer over 8 weeks">
          <MemoryHeatmap data={heatmap} />
        </AdminPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <AdminPanel title="Knowledge base" subtitle="Structured business understanding" className="lg:col-span-7">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-stone/15" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-cream">No knowledge yet.</p>
              <p className="mt-2 text-sm text-muted">
                Press <strong className="text-accent">Refresh Intelligence</strong> to crawl your entire platform.
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
            <AdminPanel title="Memory detail" subtitle="Source, evidence, and explainability">
              <MemoryDetail
                memory={selected}
                explanation={explanation}
                onAction={(patch) => void patchMemory(selected.id, patch)}
              />
            </AdminPanel>
          ) : (
            <AdminPanel title="Select knowledge" subtitle="Explain why · pin · verify · archive">
              <p className="text-sm text-muted">
                Every executive recommendation cites memories like these. Use Explain Why to see the full reasoning chain.
              </p>
            </AdminPanel>
          )}

          <AdminPanel title="Knowledge graph" subtitle={`${graph?.nodes.length ?? 0} nodes · ${graph?.edges.length ?? 0} relationships`}>
            <MemoryGraphVisual data={graph} />
            <p className="mt-3 text-xs text-muted">
              Graph updates automatically on each Refresh & Learn — connecting clients, projects, sessions, pages, and revenue.
            </p>
          </AdminPanel>

          <AdminPanel title="Refresh automation" subtitle="Control when ÉLEVÉ AI re-crawls the platform">
            <ul className="space-y-2">
              {automationOptions.map((opt) => (
                <li key={opt.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className={opt.enabled ? "text-cream" : "text-muted"}>{opt.label}</span>
                  <button
                    type="button"
                    disabled={automationSaving}
                    onClick={() => void toggleAutomation(opt.id, !opt.enabled)}
                    className={cn(
                      "rounded-full border px-3 py-1 transition-colors",
                      opt.enabled
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-stone/25 text-muted hover:border-stone/40"
                    )}
                  >
                    {opt.enabled ? "On" : "Off"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.65rem] text-muted">
              Nightly and weekly crons run when enabled. Event triggers fire after bookings, uploads, and CRM updates.
            </p>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function RefreshReportPanel({ report, onDismiss }: { report: RefreshLearnReport; onDismiss: () => void }) {
  const exec = report.executiveReport;

  return (
    <section className="os-glass rounded-2xl border border-accent/25 p-5 sm:p-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Executive Intelligence Report</p>
          <p className="mt-2 text-sm text-cream">{exec?.summary}</p>
          <p className="mt-2 text-xs text-fog">
            {report.routesDiscovered ?? report.pagesScanned} routes · {report.findingsGenerated} knowledge nodes ·{" "}
            {report.memoriesMerged ?? 0} merged · health {exec?.overallHealthScore ?? "—"}/100
          </p>
        </div>
        <button type="button" onClick={onDismiss} className="text-xs text-muted hover:text-cream">
          Dismiss
        </button>
      </div>

      {exec && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ReportColumn title="What changed" items={exec.whatChanged} />
          <ReportColumn title="What improved" items={exec.whatImproved} accent />
          <ReportColumn title="What declined" items={exec.whatDeclined} warn />
        </div>
      )}

      {exec && exec.recommendations.length > 0 && (
        <div className="mt-6">
          <p className="text-[0.6rem] uppercase tracking-wider text-accent">Prioritized recommendations</p>
          <ul className="mt-3 space-y-3">
            {exec.recommendations.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-xl border border-stone/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-cream">{r.title}</p>
                  <span className="text-[0.6rem] text-muted">P{r.priority}</span>
                </div>
                <p className="mt-1 text-xs text-fog">{r.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[0.6rem] text-muted">
                  <span>Traffic {r.expectedTrafficIncrease}</span>
                  <span>·</span>
                  <span>Conversion {r.expectedConversionIncrease}</span>
                  <span>·</span>
                  <span>Revenue {r.expectedRevenueImpact}</span>
                  <span>·</span>
                  <span>{r.implementationEffort} effort</span>
                  <span>·</span>
                  <span>{Math.round(r.confidence * 100)}% conf</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {exec && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AuditBucket title="SEO opportunities" items={exec.seoOpportunities} />
          <AuditBucket title="Conversion blockers" items={exec.conversionBlockers} />
          <AuditBucket title="Missing CTAs" items={exec.missingCTAs} />
          <AuditBucket title="Broken links" items={exec.brokenInternalLinks} />
        </div>
      )}

      {report.issuesFound.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.6rem] uppercase text-amber-400">Issues ({report.issuesFound.length})</p>
          <ul className="mt-2 space-y-1 text-xs text-fog">
            {report.issuesFound.slice(0, 6).map((i) => (
              <li key={`${i.page}-${i.title}`}>
                • [{i.severity}] {i.title} — {i.page}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReportColumn({
  title,
  items,
  accent,
  warn,
}: {
  title: string;
  items: string[];
  accent?: boolean;
  warn?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p
        className={cn(
          "text-[0.6rem] uppercase",
          warn ? "text-amber-400" : accent ? "text-emerald-400" : "text-muted"
        )}
      >
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-fog">
        {items.slice(0, 5).map((c) => (
          <li key={c}>• {c}</li>
        ))}
      </ul>
    </div>
  );
}

function AuditBucket({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-stone/15 p-3">
      <p className="text-[0.55rem] uppercase text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-[0.65rem] text-fog">
        {items.slice(0, 3).map((i) => (
          <li key={i} className="line-clamp-2">• {i}</li>
        ))}
      </ul>
    </div>
  );
}

function EventDetail({ event }: { event: LearningTimelineEvent }) {
  return (
    <div className="space-y-3">
      <p className="text-[0.6rem] uppercase text-muted">
        {new Date(event.date).toLocaleString()} · {event.category}
      </p>
      <h4 className="font-display text-lg text-cream">{event.title}</h4>
      <p className="text-sm text-fog">{event.detail}</p>
      {event.changes && event.changes.length > 0 && (
        <div>
          <p className="text-[0.6rem] uppercase text-accent">Changes</p>
          <ul className="mt-2 space-y-1 text-xs text-fog">
            {event.changes.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
      )}
      {event.confidence !== undefined && (
        <p className="text-xs text-muted">Confidence: {Math.round(event.confidence * 100)}%</p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="os-panel rounded-xl p-4 text-center">
      <p className="font-display text-2xl text-cream">{value}</p>
      <p className="mt-1 text-[0.55rem] tracking-[0.14em] text-muted uppercase">{label}</p>
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
  explanation,
  onAction,
}: {
  memory: MemoryRecord;
  explanation: MemoryExplanation | null;
  onAction: (patch: Record<string, unknown>) => void;
}) {
  const sourcePage = (memory.value.sourcePage as string) ?? memory.sourceRef.replace("platform:", "");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
          {memory.layer} · {memory.category} · {sourcePage || memory.source}
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

      {explanation && (
        <details open className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <summary className="cursor-pointer text-sm font-medium text-accent">Explain Why</summary>
          <div className="mt-3 space-y-3 text-xs text-fog">
            <p>
              <span className="text-cream">Why it matters:</span> {explanation.whyItMatters}
            </p>
            <p>
              <span className="text-cream">Business area:</span> {explanation.businessArea}
            </p>
            {explanation.uncertain && (
              <p className="text-amber-300">{explanation.uncertaintyNote}</p>
            )}
            <div>
              <p className="text-muted uppercase tracking-wider mb-1">Reasoning chain</p>
              <ul className="space-y-1">
                {explanation.reasoningChain.map((r) => (
                  <li key={r}>→ {r}</li>
                ))}
              </ul>
            </div>
            {explanation.relatedMemories.length > 0 && (
              <div>
                <p className="text-muted uppercase tracking-wider mb-1">Related memories</p>
                <ul className="space-y-1">
                  {explanation.relatedMemories.map((r) => (
                    <li key={r.id}>
                      {r.title} <span className="text-muted">({r.relationType})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explanation.analyticsReferenced.length > 0 && (
              <div>
                <p className="text-muted uppercase tracking-wider mb-1">Analytics</p>
                <ul className="space-y-1">
                  {explanation.analyticsReferenced.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      <pre className="max-h-32 overflow-auto rounded-lg border border-stone/20 bg-ink/50 p-3 text-[0.65rem] text-fog">
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
