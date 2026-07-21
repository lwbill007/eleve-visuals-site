"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { AdminOverlay } from "@/components/admin/os/AdminOverlay";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceButton,
} from "@/components/admin/os/WorkspaceFrame";
import { MemoryGraphVisual } from "@/components/admin/ai/MemoryGraphVisual";
import type { CognitiveArchitecture, KnowledgeObject, StrategySimulation } from "@/lib/ai/cognitive/types";
import type { MemoryExplanation } from "@/lib/ai/memory/knowledge/types";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import {
  describeEvidenceWeight,
  describeSimulationBasis,
  keepStaleOnFailure,
  selectBatchVerificationPreview,
} from "@/lib/admin-intelligence-ui";
import { cn } from "@/lib/utils";

const BRAIN_CHROME = {
  eyebrow: "Brain · What have we learned?",
  title: "Business Brain",
  description:
    "A task-focused view of configured rules, observed evidence, human verification, heuristic simulations, and refresh automation.",
} as const;

function CognitiveSection({
  step,
  title,
  subtitle,
  children,
  defaultOpen = true,
  visible = true,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  visible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!visible) return null;
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
        {obj.verified ? "Verified" : "Unverified"} · weight {Math.round(obj.confidence * 100)}% · {obj.relationshipCount} links
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
  const [verifyStats, setVerifyStats] = useState<{ verifiedPct: number; pending: number; targetPct: number } | null>(null);
  const [verifyQueue, setVerifyQueue] = useState<{ id: string; title: string }[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [activeView, setActiveView] = useState<
    "overview" | "evidence" | "verification" | "simulation" | "automation"
  >("overview");
  const [panelErrors, setPanelErrors] = useState<{
    architecture?: string;
    verification?: string;
    simulation?: string;
    objectDetail?: string;
  }>({});
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);

  const aiContextData = useMemo(
    () =>
      arch
        ? {
          executiveSummary: arch.executiveBriefing.executiveSummary,
          biggestOpportunity: arch.executiveBriefing.biggestOpportunity,
          unknownsCount: arch.unknowns.length,
          knowledgeHealth: arch.knowledgeHealth.find((h) => h.id === "understanding")?.score,
          graphNodes: arch.graph.totalNodes,
        }
        : undefined,
    [arch]
  );
  useSetAIPage("memory", aiContextData, "Business Brain");

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setPanelErrors((current) => ({ ...current, architecture: undefined, verification: undefined }));

    const [architectureResult, verificationResult] = await Promise.allSettled([
      adminFetch(`/api/admin/ai/cognitive${force ? "?refresh=1" : ""}`),
      adminFetch("/api/admin/ai/memory/verify"),
    ]);

    if (architectureResult.status === "fulfilled" && architectureResult.value.ok) {
      try {
        const nextArchitecture = (await architectureResult.value.json()) as CognitiveArchitecture;
        setArch((current) => keepStaleOnFailure(current, nextArchitecture));
      } catch {
        setPanelErrors((current) => ({
          ...current,
          architecture: "Business Brain returned invalid data. Showing the last successful snapshot.",
        }));
      }
    } else {
      setPanelErrors((current) => ({
        ...current,
        architecture: "Business Brain could not refresh. Showing the last successful snapshot.",
      }));
    }

    if (verificationResult.status === "fulfilled" && verificationResult.value.ok) {
      try {
        const verification = await verificationResult.value.json();
        setVerifyStats(verification.stats);
        setVerifyQueue(verification.queue ?? []);
      } catch {
        setPanelErrors((current) => ({
          ...current,
          verification: "Verification returned invalid data. Existing queue data is preserved.",
        }));
      }
    } else {
      setPanelErrors((current) => ({
        ...current,
        verification: "Verification could not refresh. Existing queue data is preserved.",
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadObjectDetail(obj: KnowledgeObject) {
    setSelectedObject(obj);
    setExplanation(null);
    setPanelErrors((current) => ({ ...current, objectDetail: undefined }));
    try {
      const res = await adminFetch(`/api/admin/ai/memory/${obj.memoryId}/explain`);
      if (!res.ok) throw new Error("Explanation unavailable");
      setExplanation(await res.json());
    } catch {
      setPanelErrors((current) => ({
        ...current,
        objectDetail: "The explanation is unavailable; the selected memory remains visible.",
      }));
    }
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

  async function runAutoVerify() {
    setVerifying(true);
    try {
      const res = await adminFetch("/api/admin/ai/memory/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto" }),
      });
      const data = await res.json();
      if (data.stats) setVerifyStats(data.stats);
      await load(true);
      setMessage(`Auto-verified ${data.promoted ?? 0} · trusted ${data.trusted ?? 0}`);
    } finally {
      setVerifying(false);
    }
  }

  async function batchVerifyQueue() {
    const ids = selectBatchVerificationPreview(verifyQueue).map((q) => q.id);
    if (!ids.length) return;
    setVerifying(true);
    try {
      const res = await adminFetch("/api/admin/ai/memory/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch", memoryIds: ids, status: "verified" }),
      });
      const data = await res.json();
      if (data.stats) setVerifyStats(data.stats);
      await load(true);
      setMessage(`Batch verified ${data.count} memories`);
      setBatchPreviewOpen(false);
    } finally {
      setVerifying(false);
    }
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
    setPanelErrors((current) => ({ ...current, simulation: undefined }));
    try {
      const res = await adminFetch("/api/admin/ai/cognitive/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (res.ok) {
        setSimulation(await res.json());
      } else {
        setPanelErrors((current) => ({
          ...current,
          simulation: "Simulation failed. The previous scenario remains visible.",
        }));
      }
    } catch {
      setPanelErrors((current) => ({
        ...current,
        simulation: "Simulation failed. The previous scenario remains visible.",
      }));
    } finally {
      setSimulating(false);
    }
  }

  const related = [
    { label: "Timeline", href: "/admin/timeline", desc: "What happened?" },
    { label: "Briefing", href: "/admin/briefing", desc: "Daily brief" },
    { label: "Opportunities", href: "/admin/opportunities", desc: "Execute" },
    { label: "Executive QA", href: "/admin/qa", desc: "Gaps" },
  ];

  if (loading && !arch) {
    return (
      <WorkspaceChrome {...BRAIN_CHROME} related={related}>
        <WorkspaceLoading rows={5} />
      </WorkspaceChrome>
    );
  }

  if (!arch) {
    return (
      <WorkspaceChrome {...BRAIN_CHROME} related={related}>
        <WorkspaceError
          message={panelErrors.architecture || "Failed to load cognitive architecture."}
          onRetry={() => void load()}
        />
      </WorkspaceChrome>
    );
  }

  const capabilities: OsCapability[] = [
    {
      id: "rules",
      label: "Business rules",
      status: arch.businessDna.mission ? "live" : "planned",
      summary: arch.businessDna.mission
        ? "Business DNA (positioning, pricing, creative, growth) is loaded from memory."
        : "Business DNA not yet populated.",
    },
    {
      id: "decisions",
      label: "Decision journal",
      status: arch.decisionJournal.length > 0 ? "live" : "partial",
      summary:
        arch.decisionJournal.length > 0
          ? `${arch.decisionJournal.length} recorded Execute decisions.`
          : "Journal ready — no Execute decisions recorded yet.",
    },
    {
      id: "patterns",
      label: "Learned patterns",
      status: arch.learningPatterns.length > 0 ? "live" : "partial",
      summary:
        arch.learningPatterns.length > 0
          ? `${arch.learningPatterns.length} recent learnings from the engine.`
          : "Learning engine online — awaiting verified outcomes.",
    },
    {
      id: "graph",
      label: "Knowledge graph",
      status: arch.graph.totalNodes > 0 ? "live" : "partial",
      summary: `${arch.graph.totalNodes} nodes · ${arch.graph.totalEdges} edges · health ${arch.graph.health.healthScore}%`,
    },
    {
      id: "outcome-accuracy",
      label: "Outcome accuracy rollup",
      status: "planned",
      summary: "Global prediction→outcome accuracy not aggregated here.",
      missing: {
        label: "Outcome accuracy",
        reason: "No verified prediction→outcome rollup wired on Business Brain yet",
        required: ["AILearningOutcome coverage", "PredictionContract verification"],
        confidence: 0,
        unlockAfter: "Unlock after prediction verification rollup",
        owner: METRIC_OWNERS.ai_operations,
        unlockHref: "/admin/ai-operations",
      },
    },
  ];

  const filteredObjects =
    objectFilter === "all"
      ? arch.knowledgeObjects
      : arch.knowledgeObjects.filter((o) => o.type === objectFilter);

  const objectTypes = Object.entries(arch.objectCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <WorkspaceChrome
      {...BRAIN_CHROME}
      onRefresh={() => void refreshIntelligence()}
      refreshing={refreshing}
      extra={
        <WorkspaceButton variant="primary" onClick={() => void refreshIntelligence()} disabled={refreshing}>
          {refreshing ? "Scanning…" : "Refresh intelligence"}
        </WorkspaceButton>
      }
      related={related}
    >
      {message && (
        <p className="mb-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-cream">{message}</p>
      )}

      {panelErrors.architecture && arch ? (
        <WorkspaceError message={panelErrors.architecture} onRetry={() => void load()} />
      ) : null}

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Business Brain views">
        {[
          ["overview", "Overview"],
          ["evidence", "Evidence"],
          ["verification", `Verification${verifyStats ? ` (${verifyStats.pending})` : ""}`],
          ["simulation", "Simulation"],
          ["automation", "Automation"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveView(id as typeof activeView)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs uppercase transition-colors",
              activeView === id
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-stone/25 text-fog hover:border-accent/30"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeView === "overview" ? (
        <OsCapabilityGrid
          title="Current operating picture"
          subtitle="Observed capabilities and explicit gaps. Scores below identify their basis."
          capabilities={capabilities}
          className="mb-8"
        />
      ) : null}

      {activeView === "verification" && panelErrors.verification ? (
        <WorkspaceError message={panelErrors.verification} onRetry={() => void load()} />
      ) : null}

      {activeView === "verification" && verifyStats ? (
        <AdminPanel title="Verification Queue" subtitle={`Target ${verifyStats.targetPct}% verified · currently ${verifyStats.verifiedPct}%`} className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              disabled={verifying}
              onClick={() => void runAutoVerify()}
              className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 uppercase hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Auto-verify (evidence-backed)
            </button>
            <button
              type="button"
              disabled={verifying || verifyQueue.length === 0}
              onClick={() => setBatchPreviewOpen(true)}
              className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs text-accent uppercase hover:bg-accent/10 disabled:opacity-50"
            >
              Batch verify top 20 pending
            </button>
          </div>
          {verifyStats.verifiedPct < 90 && (
            <p className="text-xs text-amber-300">
              {verifyStats.pending} memories pending — recommendations prioritize verified/trusted knowledge only.
            </p>
          )}
        </AdminPanel>
      ) : null}

      {activeView === "overview" ? <div className="mb-8 flex flex-wrap gap-2">
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
            {s.label} · {s.status === "active" ? "configured" : s.status}
          </span>
        ))}
      </div> : null}

      <div className="max-w-4xl">
        <CognitiveSection visible={activeView === "overview"} step={1} title="Executive Briefing" subtitle="Latest generated synthesis; estimates remain estimates">
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

        <CognitiveSection visible={activeView === "overview"} step={2} title="Business DNA" subtitle="Configured operating doctrine plus connected brand memory">
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
              {arch.businessDna.decisionPrinciples.length} decision principles · {arch.businessDna.northStarMetrics.length} north star metrics · configured baseline weight {Math.round(arch.businessDna.confidence * 100)}% (not measured accuracy)
            </p>
          </div>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "evidence"} step={1} title="Knowledge Graph" subtitle={`${arch.graph.totalNodes} nodes · ${arch.graph.totalEdges} relationships · relationship coverage score ${arch.graph.health.healthScore}%`} defaultOpen>
          <div className="mb-4 rounded-lg border border-stone/20 p-3 text-xs">
            <p className="text-cream">
              Relationship coverage score: {arch.graph.health.healthScore}% · configured target {arch.graph.health.targetEdges}+ edges
            </p>
            <p className="mt-1 text-fog">{arch.graph.health.explanation}</p>
            <p className="mt-1 text-muted">
              Density {arch.graph.health.density.toFixed(2)} · status: {arch.graph.health.status.replace("_", " ")}
            </p>
          </div>
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

        <CognitiveSection visible={activeView === "evidence"} step={2} title="Executive Reasoning" subtitle="Observed inputs, model inferences, and unknowns" defaultOpen={false}>
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
            <p className="text-fog">Expected: {arch.reasoning.expectedOutcome} · recommendation model score {Math.round(arch.reasoning.confidence * 100)}% (not observed accuracy)</p>
            {arch.reasoning.unknowns.length > 0 && (
              <p className="text-amber-300">Unknowns: {arch.reasoning.unknowns.join(" · ")}</p>
            )}
          </div>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "evidence"} step={3} title="Learning Engine" subtitle="Recorded outcomes and their stored weights" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.learningPatterns.length === 0 ? (
              <li className="text-xs text-fog">No learnings yet — Execute a recommendation to start the loop.</li>
            ) : (
              arch.learningPatterns.map((p) => (
                <li key={p.pattern} className="rounded border border-stone/15 p-3 text-xs">
                  <p className="text-cream">{p.pattern}</p>
                  <p className="mt-1 text-fog">{p.businessImpact}</p>
                  <p className="mt-1 text-muted">{p.source} · stored model weight {Math.round(p.confidence * 100)}%</p>
                </li>
              ))
            )}
          </ul>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "evidence"} step={4} title="Decision Journal" subtitle="Recorded actions and outcomes; missing outcomes remain unknown" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.decisionJournal.length === 0 ? (
              <li className="text-xs text-fog">No decisions yet — Execute from Opportunities or Command Center.</li>
            ) : (
              arch.decisionJournal.map((d) => (
                <li key={d.id} className="rounded border border-stone/15 p-3 text-xs">
                  <p className="text-cream">{d.recommendation}</p>
                  <p className="mt-1 text-fog">
                    {d.status}
                    {d.outcome ? ` · ${d.outcome}` : ""}
                    {d.expectedROI ? ` · expected ~$${d.expectedROI.toLocaleString()}` : ""}
                    {d.revenueImpact ? ` · actual ~$${d.revenueImpact.toLocaleString()}` : ""}
                    {d.predictionAccuracy != null
                      ? ` · ${Math.round(d.predictionAccuracy * 100)}% accuracy`
                      : ""}
                  </p>
                  {d.expectedOutcome && (
                    <p className="mt-1 text-muted">Expected: {d.expectedOutcome}</p>
                  )}
                  {d.lesson && <p className="mt-1 text-muted">{d.lesson}</p>}
                </li>
              ))
            )}
          </ul>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "overview"} step={3} title="Unknowns Center" subtitle="Gaps returned by the current scan">
          <ul className="space-y-2">
            {arch.unknowns.length === 0 ? (
              <li className="text-xs text-fog">No material gaps were returned by this scan. This does not prove connector or data completeness.</li>
            ) : (
              arch.unknowns.map((u) => (
                <li
                  key={u.id}
                  className={cn(
                    "rounded border p-3 text-xs",
                    u.severity === "high" ? "border-red-500/25 bg-red-500/5" : "border-stone/15"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-cream">{u.title}</p>
                    <span className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{u.status}</span>
                  </div>
                  <p className="mt-1 text-fog">{u.detail}</p>
                  <p className="mt-2 text-cream-dim">
                    <span className="text-muted">Why it matters · </span>
                    {u.whyItMatters}
                  </p>
                  <p className="mt-1 text-cream-dim">
                    <span className="text-muted">Impact · </span>
                    {u.businessImpact}
                  </p>
                  <p className="mt-1 text-emerald-400/90">
                    <span className="text-muted">After resolve · </span>
                    {u.estimatedImprovement}
                  </p>
                  <Link href={u.connectHref} className="mt-2 inline-block text-accent hover:underline">
                    {u.connectAction} →
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "evidence"} step={5} title="Knowledge Quality Indicators" subtitle="Calculated, estimated, and predicted scores are labeled by basis" defaultOpen={false}>
          <div className="space-y-3">
            {arch.knowledgeHealth.map((h) => (
              <div key={h.id}>
                <HealthBar score={h.score} label={h.label} />
                <p className="mt-1 text-[0.65rem] text-muted">{h.quality} · {h.why}</p>
              </div>
            ))}
          </div>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "evidence"} step={6} title="Memory Explorer" subtitle="Inspect source objects and verification state" defaultOpen={false}>
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
              {panelErrors.objectDetail ? <p className="mt-3 text-xs text-amber-300">{panelErrors.objectDetail}</p> : null}
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

        <CognitiveSection visible={activeView === "evidence"} step={7} title="Evidence Center" subtitle="Named sources and model weights; verification state varies" defaultOpen={false}>
          <ul className="space-y-2">
            {arch.evidence.map((e) => (
              <li key={e.id} className="rounded border border-stone/15 p-3 text-xs">
                <p className="text-cream">{e.title}</p>
                <p className="mt-1 text-fog">{e.businessImpact}</p>
                <p className="mt-1 text-muted">
                  {e.source} · {e.type} · weight {Math.round(e.confidence * 100)}% · {e.freshness}
                </p>
                <p className="mt-1 text-[0.6rem] text-muted">{describeEvidenceWeight(e.type)}</p>
              </li>
            ))}
          </ul>
        </CognitiveSection>

        <CognitiveSection visible={activeView === "simulation"} step={1} title="Strategy Simulator" subtitle="Heuristic what-if ranges; not validated forecasts">
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
          {panelErrors.simulation ? <p className="mt-4 text-xs text-amber-300">{panelErrors.simulation}</p> : null}
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
                  <p className="text-muted">Model basis</p>
                  <p className="text-cream">{Math.round(simulation.confidence * 100)}%</p>
                </div>
              </div>
              <p className="mt-2 text-fog">{simulation.demand}</p>
              <p className="mt-1 text-amber-300">Risk: {simulation.risk}</p>
              <p className="mt-2 text-muted">{describeSimulationBasis(simulation.confidence)}</p>
              <ul className="mt-3 space-y-1 border-t border-stone/20 pt-3 text-muted">
                {simulation.assumptions.map((assumption) => <li key={assumption}>• {assumption}</li>)}
              </ul>
            </div>
          )}
        </CognitiveSection>

        <CognitiveSection visible={activeView === "automation"} step={1} title="Automation Intelligence" subtitle="Configured refresh triggers and last recorded run">
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
      <AdminOverlay
        open={batchPreviewOpen}
        onClose={() => setBatchPreviewOpen(false)}
        title="Review batch verification"
        description="Preview the exact memories before changing their verification state."
        className="max-w-2xl"
        closeOnBackdrop={!verifying}
      >
        <div className="border-b border-stone/25 px-5 py-4">
          <p className="text-[0.65rem] tracking-[0.14em] text-accent uppercase">Verification preview</p>
          <h2 className="mt-1 font-display text-2xl text-cream">
            Verify {selectBatchVerificationPreview(verifyQueue).length} pending memories?
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-fog">
            This marks every listed memory as admin-verified. Verification is an explicit human
            assertion; it is not produced by the model confidence score.
          </p>
          <ol className="max-h-72 space-y-2 overflow-y-auto">
            {selectBatchVerificationPreview(verifyQueue).map((item, index) => (
              <li key={item.id} className="rounded-lg border border-stone/25 px-3 py-2 text-sm text-cream">
                <span className="mr-2 text-muted">{index + 1}.</span>
                {item.title}
              </li>
            ))}
          </ol>
          <div className="flex flex-col-reverse gap-2 border-t border-stone/20 pt-4 sm:flex-row sm:justify-end">
            <WorkspaceButton
              variant="secondary"
              onClick={() => setBatchPreviewOpen(false)}
              disabled={verifying}
            >
              Cancel
            </WorkspaceButton>
            <WorkspaceButton
              variant="primary"
              onClick={() => void batchVerifyQueue()}
              disabled={verifying || verifyQueue.length === 0}
            >
              {verifying ? "Verifying…" : "Confirm verification"}
            </WorkspaceButton>
          </div>
        </div>
      </AdminOverlay>
    </WorkspaceChrome>
  );
}
