"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { MemoryGraphVisual } from "@/components/admin/ai/MemoryGraphVisual";
import type { CognitiveArchitecture, KnowledgeObject, StrategySimulation } from "@/lib/ai/cognitive/types";
import type { MemoryExplanation } from "@/lib/ai/memory/knowledge/types";
import { cn } from "@/lib/utils";

function CognitiveSection({
  step,
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="relative border-l-2 border-accent/20 pl-6 pb-10 ml-3">
      <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.5rem] font-bold text-ink">
        {step}
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
        <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">System {step}</p>
        <h3 className="font-display text-lg text-cream">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-fog">{subtitle}</p>}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function HealthBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-cream">{label}</span>
        <span className="text-fog">{score}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-stone/30">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ObjectCard({ obj, onSelect }: { obj: KnowledgeObject; onSelect?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border border-stone/15 p-3 text-left text-xs transition-colors hover:border-accent/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-cream">{obj.title}</p>
        <span className="shrink-0 rounded border border-stone/25 px-1.5 py-0.5 text-[0.55rem] uppercase text-muted">
          {obj.type}
        </span>
      </div>
      <p className="mt-1 text-fog line-clamp-2">{obj.summary || obj.businessImpact}</p>
      <p className="mt-2 text-muted">
        {obj.verified ? "Verified" : "Unverified"} · {Math.round(obj.confidence * 100)}% conf · {obj.relationshipCount} links
      </p>
    </button>
  );
}

export function CognitiveArchitectureClient() {
  const [arch, setArch] = useState<CognitiveArchitecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [simulation, setSimulation] = useState<StrategySimulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [selectedObject, setSelectedObject] = useState<KnowledgeObject | null>(null);
  const [explanation, setExplanation] = useState<MemoryExplanation | null>(null);

  useSetAIPage(
    "memory",
    arch
      ? {
          executiveSummary: arch.executiveBriefing.executiveSummary,
          biggestOpportunity: arch.executiveBriefing.biggestOpportunity,
          unknownsCount: arch.unknowns.length,
          knowledgeHealth: arch.knowledgeHealth.find((h) => h.id === "understanding")?.score,
          graphNodes: arch.graph.totalNodes,
        }
      : undefined,
    "Knowledge Engine"
  );

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/ai/cognitive${force ? "?refresh=1" : ""}`);
      if (res.ok) setArch(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadObjectDetail(obj: KnowledgeObject) {
    setSelectedObject(obj);
    setExplanation(null);
    const res = await adminFetch(`/api/admin/ai/memory/${obj.memoryId}/explain`);
    if (res.ok) setExplanation(await res.json());
  }

  async function toggleObjectFlag(field: "verified" | "pinned", value: boolean) {
    if (!selectedObject) return;
    await adminFetch(`/api/admin/ai/memory/${selectedObject.memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await load(true);
    await loadObjectDetail({ ...selectedObject, verified: field === "verified" ? value : selectedObject.verified });
  }

  async function refreshIntelligence() {
    setRefreshing(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/ai/cognitive/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setMessage(data.message);
      await load(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function runSimulation(scenarioId: string) {
    setSimulating(true);
    try {
      const res = await adminFetch("/api/admin/ai/cognitive/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (res.ok) setSimulation(await res.json());
    } finally {
      setSimulating(false);
    }
  }

  if (loading && !arch) {
    return <p className="text-fog">Loading cognitive architecture…</p>;
  }

  if (!arch) return <p className="text-fog">Failed to load cognitive architecture.</p>;

  let step = 0;
  const next = () => ++step;

  const filteredObjects =
    objectFilter === "all"
      ? arch.knowledgeObjects
      : arch.knowledgeObjects.filter((o) => o.type === objectFilter);

  const objectTypes = Object.entries(arch.objectCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="ÉLEVÉ Cognitive Architecture"
        title="Knowledge Engine"
        description="Not a memory list — the permanent intelligence layer powering every recommendation, prediction, and business decision."
        action={
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshIntelligence()}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-ink uppercase hover:bg-cream disabled:opacity-50"
          >
            {refreshing ? "Scanning platform…" : "Refresh Executive Intelligence"}
          </button>
        }
      />

      {message && (
        <p className="mb-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-cream">{message}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-4 text-xs">
        <Link href="/admin/intelligence" className="text-accent hover:underline">
          Command Center →
        </Link>
        <Link href="/admin/insights" className="text-accent hover:underline">
          Insights & Actions →
        </Link>
        <Link href="/admin/opportunities" className="text-accent hover:underline">
          Opportunities →
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {arch.systems.map((s) => (
          <span
            key={s.id}
            className={cn(
              "rounded-full border px-3 py-1 text-[0.55rem] tracking-[0.06em] uppercase",
              s.status === "active"
                ? "border-emerald-500/30 text-emerald-400"
                : "border-amber-500/30 text-amber-300"
            )}
            title={s.contribution}
          >
            {s.label}
          </span>
        ))}
      </div>

      <div className="max-w-4xl">
        <CognitiveSection step={next()} title="Executive Briefing" subtitle="Auto-generated from last intelligence refresh">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <p className="text-sm text-cream">{arch.executiveBriefing.executiveSummary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className="text-emerald-400 uppercase">Biggest discovery</p>
                <p className="mt-1 text-fog">{arch.executiveBriefing.biggestDiscovery}</p>
              </div>
              <div>
                <p className="text-accent uppercase">Biggest opportunity</p>
                <p className="mt-1 text-fog">{arch.executiveBriefing.biggestOpportunity}</p>
              </div>
              <div>
                <p className="text-red-400 uppercase">Biggest risk</p>
                <p className="mt-1 text-fog">{arch.executiveBriefing.biggestRisk}</p>
              </div>
              <div>
                <p className="text-muted uppercase">Expected ROI</p>
                <p className="mt-1 text-fog">{arch.executiveBriefing.expectedRoi}</p>
              </div>
            </div>
            {arch.executiveBriefing.recommendedActions.length > 0 && (
              <ul className="mt-4 space-y-2">
                {arch.executiveBriefing.recommendedActions.map((a) => (
                  <li key={a.title}>
                    <Link href={a.href} className="text-sm text-accent hover:underline">
                      {a.title} — {a.expectedRoi}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Business DNA" subtitle="Permanent understanding — every recommendation references this first">
          <div className="space-y-3 text-sm">
            <p className="text-cream">{arch.businessDna.mission}</p>
            <p className="text-fog">{arch.businessDna.vision}</p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <AdminPanel title="Positioning">
                <p className="text-fog">{arch.businessDna.luxuryPositioning}</p>
              </AdminPanel>
              <AdminPanel title="Pricing philosophy">
                <p className="text-fog">{arch.businessDna.pricingPhilosophy}</p>
              </AdminPanel>
              <AdminPanel title="Creative direction">
                <p className="text-fog">{arch.businessDna.creativeDirection}</p>
              </AdminPanel>
              <AdminPanel title="Growth strategy">
                <p className="text-fog">{arch.businessDna.growthStrategy}</p>
              </AdminPanel>
            </div>
            <p className="text-xs text-muted">
              {arch.businessDna.decisionPrinciples.length} decision principles · {arch.businessDna.northStarMetrics.length} north star metrics · {Math.round(arch.businessDna.confidence * 100)}% confidence
            </p>
          </div>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Knowledge Graph" subtitle={`${arch.graph.totalNodes} nodes · ${arch.graph.totalEdges} relationships`} defaultOpen={false}>
          <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-fog">
            {arch.graph.chainExample.map((node, i) => (
              <span key={`${node}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-accent">→</span>}
                <span className="rounded border border-stone/20 px-2 py-0.5 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                  {node}
                </span>
              </span>
            ))}
          </div>
          <MemoryGraphVisual
            data={{
              nodes: arch.graph.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                layer: n.layer as import("@/lib/ai/memory/types").MemoryLayer,
                category: n.type ?? "",
              })),
              edges: arch.graph.edges,
            }}
          />
          {arch.graph.growth.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.6rem] uppercase text-muted mb-2">Graph growth over refreshes</p>
              <div className="flex items-end gap-1 h-16">
                {arch.graph.growth.map((g) => (
                  <div key={g.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${g.date}: ${g.nodes} nodes, ${g.edges} edges`}>
                    <div className="w-full bg-accent/60 rounded-t transition-all duration-500" style={{ height: `${Math.max(8, (g.edges / Math.max(...arch.graph.growth.map((x) => x.edges), 1)) * 48)}px` }} />
                    <span className="text-[0.45rem] text-muted">{g.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CognitiveSection>

        <CognitiveSection step={next()} title="Executive Reasoning" subtitle="Nothing is a black box" defaultOpen={false}>
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-muted uppercase">Observed</p>
              <ul className="mt-1 text-fog">{arch.reasoning.observed.map((o) => <li key={o}>• {o}</li>)}</ul>
            </div>
            <div>
              <p className="text-muted uppercase">Learned</p>
              <ul className="mt-1 text-fog">{arch.reasoning.learned.map((l) => <li key={l}>• {l}</li>)}</ul>
            </div>
            <div>
              <p className="text-muted uppercase">Predicted</p>
              <ul className="mt-1 text-fog">{arch.reasoning.predicted.map((p) => <li key={p}>• {p}</li>)}</ul>
            </div>
            <p className="text-sm text-cream">{arch.reasoning.concluded}</p>
            <p className="text-accent">→ {arch.reasoning.recommended}</p>
            <p className="text-fog">Expected: {arch.reasoning.expectedOutcome} · {Math.round(arch.reasoning.confidence * 100)}% confidence</p>
            {arch.reasoning.unknowns.length > 0 && (
              <p className="text-amber-300">Unknowns: {arch.reasoning.unknowns.join(" · ")}</p>
            )}
          </div>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Learning Engine" subtitle="Patterns that strengthen future recommendations" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.learningPatterns.map((p) => (
              <li key={p.pattern} className="rounded border border-stone/15 p-3 text-xs">
                <p className="text-cream">{p.pattern}</p>
                <p className="mt-1 text-fog">{p.businessImpact}</p>
                <p className="mt-1 text-muted">{p.source} · {Math.round(p.confidence * 100)}%</p>
              </li>
            ))}
          </ul>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Decision Journal" subtitle="Every recommendation tracked forever" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.decisionJournal.map((d) => (
              <li key={d.id} className="rounded border border-stone/15 p-3 text-xs">
                <p className="text-cream">{d.recommendation}</p>
                <p className="mt-1 text-fog">
                  {d.status} · {d.outcome ?? "pending"}
                  {d.revenueImpact ? ` · $${d.revenueImpact}` : ""}
                </p>
                {d.lesson && <p className="mt-1 text-muted">{d.lesson}</p>}
              </li>
            ))}
          </ul>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Unknowns Center" subtitle="Actively reducing uncertainty">
          <ul className="space-y-2">
            {arch.unknowns.map((u) => (
              <li key={u.id} className={cn("rounded border p-3 text-xs", u.severity === "high" ? "border-red-500/25 bg-red-500/5" : "border-stone/15")}>
                <p className="text-cream">{u.title}</p>
                <p className="mt-1 text-fog">{u.detail}</p>
                <p className="mt-1 text-accent">Resolve: {u.howToResolve}</p>
              </li>
            ))}
          </ul>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Knowledge Health" subtitle="Intelligence quality scores — all explainable" defaultOpen={false}>
          <div className="space-y-3">
            {arch.knowledgeHealth.map((h) => (
              <div key={h.id}>
                <HealthBar score={h.score} label={h.label} />
                <p className="mt-1 text-[0.65rem] text-muted">{h.why}</p>
              </div>
            ))}
          </div>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Memory Explorer" subtitle="Typed knowledge objects — not generic memories" defaultOpen={false}>
          <div className="mb-3 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setObjectFilter("all")}
              className={cn("rounded px-2 py-1 text-[0.6rem] uppercase", objectFilter === "all" ? "bg-accent text-ink" : "border border-stone/20 text-fog")}
            >
              All ({arch.knowledgeObjects.length})
            </button>
            {objectTypes.slice(0, 8).map(([type, count]) => (
              <button
                key={type}
                type="button"
                onClick={() => setObjectFilter(type)}
                className={cn("rounded px-2 py-1 text-[0.6rem] uppercase", objectFilter === type ? "bg-accent text-ink" : "border border-stone/20 text-fog")}
              >
                {type} ({count})
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredObjects.slice(0, 12).map((o) => (
              <ObjectCard key={o.id} obj={o} onSelect={() => void loadObjectDetail(o)} />
            ))}
          </div>
          {selectedObject && (
            <AdminPanel title="Knowledge object detail" subtitle={selectedObject.type} className="mt-4">
              <p className="text-sm text-cream">{selectedObject.title}</p>
              <p className="mt-2 text-xs text-fog">{selectedObject.summary}</p>
              <p className="mt-2 text-xs text-muted">{selectedObject.businessImpact}</p>
              {explanation && (
                <div className="mt-3 space-y-2 border-t border-stone/15 pt-3 text-xs text-fog">
                  <p>{explanation.whyItMatters}</p>
                  {explanation.reasoningChain.map((r) => (
                    <p key={r}>• {r}</p>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleObjectFlag("verified", !selectedObject.verified)}
                  className="rounded border border-stone/25 px-3 py-1 text-[0.65rem] uppercase text-fog hover:border-accent"
                >
                  {selectedObject.verified ? "Unverify" : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleObjectFlag("pinned", true)}
                  className="rounded border border-stone/25 px-3 py-1 text-[0.65rem] uppercase text-fog hover:border-accent"
                >
                  Pin
                </button>
              </div>
            </AdminPanel>
          )}
        </CognitiveSection>

        <CognitiveSection step={next()} title="Evidence Center" subtitle="Verified facts supporting decisions" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.evidence.map((e) => (
              <li key={e.id} className="rounded border border-stone/15 p-3 text-xs">
                <p className="text-cream">{e.title}</p>
                <p className="mt-1 text-fog">{e.businessImpact}</p>
                <p className="mt-1 text-muted">
                  {e.source} · {e.type} · {Math.round(e.confidence * 100)}% · {e.freshness}
                </p>
              </li>
            ))}
          </ul>
        </CognitiveSection>

        <CognitiveSection step={next()} title="Strategy Simulator" subtitle="Executive what-if scenarios" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "increase_pricing_15", label: "Pricing +15%" },
              { id: "launch_memberships", label: "Memberships" },
              { id: "open_volume_2", label: "Volume 2" },
              { id: "hire_photographer", label: "Hire photographer" },
              { id: "spend_500_ads", label: "$500 ads" },
              { id: "seasonal_campaign", label: "Seasonal campaign" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={simulating}
                onClick={() => void runSimulation(s.id)}
                className="rounded-lg border border-stone/25 px-3 py-2 text-xs text-fog uppercase hover:border-accent disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
          {simulation && (
            <div className="mt-4 rounded-xl border border-accent/20 p-4 text-xs">
              <p className="text-lg text-cream">{simulation.scenario}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-muted">Revenue</p>
                  <p className="text-cream">${simulation.revenue.low.toLocaleString()} – ${simulation.revenue.high.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted">Bookings</p>
                  <p className="text-cream">{simulation.bookings.low} – {simulation.bookings.high}</p>
                </div>
                <div>
                  <p className="text-muted">Confidence</p>
                  <p className="text-cream">{Math.round(simulation.confidence * 100)}%</p>
                </div>
              </div>
              <p className="mt-2 text-fog">{simulation.demand}</p>
              <p className="mt-1 text-amber-300">Risk: {simulation.risk}</p>
            </div>
          )}
        </CognitiveSection>

        <CognitiveSection step={next()} title="Automation Intelligence" subtitle="When intelligence refreshes" defaultOpen={false}>
          <p className="text-xs text-fog mb-2">
            Last run: {arch.automation.lastRun ? new Date(arch.automation.lastRun).toLocaleString() : "Never"}
            {arch.automation.nextScheduled ? ` · Next: ${arch.automation.nextScheduled}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {arch.automation.triggers.map((t) => (
              <span
                key={t.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.55rem] uppercase",
                  t.enabled ? "border-emerald-500/30 text-emerald-400" : "border-stone/20 text-muted"
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
        </CognitiveSection>
      </div>
    </div>
  );
}
