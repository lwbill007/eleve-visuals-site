"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import { cn } from "@/lib/utils";
import type {
  ContinuousMonitorItem,
  ExecutiveResearchReport,
  ResearchMode,
  SourceProfile,
} from "@/lib/ai/research/types";
import { RESEARCH_MODE_META } from "@/lib/ai/research/types";

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone/25 p-2 text-center">
      <p className="font-display text-lg text-cream">{value}%</p>
      <p className="text-[0.5rem] tracking-[0.08em] text-muted uppercase">{label}</p>
    </div>
  );
}

export function ResearchIntelligenceClient() {
  useSetAIPage("reports");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("executive_brief");
  const [forceExternal, setForceExternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExecutiveResearchReport | null>(null);
  const [priority, setPriority] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<SourceProfile[]>([]);
  const [monitor, setMonitor] = useState<{
    connectorWired: boolean;
    note: string;
    items: ContinuousMonitorItem[];
  } | null>(null);
  const [recent, setRecent] = useState<ExecutiveResearchReport[]>([]);

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/ai/research");
    if (!res.ok) return;
    const data = await res.json();
    setPriority(data.knowledgePriority ?? []);
    setMonitor(data.monitor ?? null);
    setRecent(data.recent ?? []);
    setProfiles(data.sourceProfiles ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runResearch() {
    if (!query.trim()) return;
    setLoading(true);
    setReport(null);
    const res = await adminFetch("/api/admin/ai/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim(),
        mode,
        forceExternal,
        persist: true,
      }),
    });
    if (res.ok) {
      setReport((await res.json()) as ExecutiveResearchReport);
      void load();
    }
    setLoading(false);
  }

  async function recordDecision(decision: "accepted" | "rejected" | "deferred") {
    if (!report) return;
    await adminFetch("/api/admin/ai/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: { researchId: report.id, decision, note: `${decision} from research UI` },
      }),
    });
    void load();
  }

  const conf = report?.researchConfidence;

  return (
    <WorkspaceChrome
      eyebrow="Command · Research"
      title="Web Research Intelligence v2"
      description="Self-aware evidence quality — multi-source gates, contradiction detection, relevance filter, and learning from ÉLEVÉ outcomes. The web is never the source of truth."
      extra={<AskAIButton />}
      related={[
        { label: "Briefing", href: "/admin/briefing", desc: "Report v3" },
        { label: "Reports", href: "/admin/reports", desc: "BI" },
        { label: "Memory", href: "/admin/memory", desc: "Research memory" },
        { label: "Website", href: "/admin/website", desc: "SEO intel" },
      ]}
    >
      <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-fog">
        Deep research only when justified. Single-source recommendations show a warning. Noise (e.g.
        cosmetic Instagram fonts) is filtered; algorithm/reach changes alert. Never fabricate
        benchmarks or competitor facts.
      </div>

      <AdminPanel title="Research mode" subtitle="Cost-aware" className="mb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(RESEARCH_MODE_META) as ResearchMode[]).map((m) => {
            const meta = RESEARCH_MODE_META[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  mode === m ? "border-accent/50 bg-accent/10" : "border-stone/25 hover:border-stone/40"
                )}
              >
                <p className="text-sm text-cream">{meta.label}</p>
                <p className="mt-1 text-[0.65rem] text-fog">{meta.description}</p>
                <p className="mt-2 text-[0.55rem] text-muted uppercase">
                  ~{meta.estimatedSeconds.min}–{meta.estimatedSeconds.max}s
                </p>
              </button>
            );
          })}
        </div>
      </AdminPanel>

      <AdminPanel title="Run gated research" className="mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder="e.g. Does the latest Google core update affect image-heavy portfolio SEO for ÉLEVÉ?"
          className="w-full rounded-lg border border-stone/30 bg-transparent px-3 py-2 text-sm text-cream placeholder:text-muted"
        />
        <label className="mt-3 flex items-center gap-2 text-xs text-fog">
          <input
            type="checkbox"
            checked={forceExternal}
            onChange={(e) => setForceExternal(e.target.checked)}
          />
          Force external consideration (still blocked if connector unwired — never invents)
        </label>
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => void runResearch()}
          className="mt-4 border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase disabled:opacity-50"
        >
          {loading ? "Evaluating evidence quality…" : "Evaluate & research"}
        </button>
      </AdminPanel>

      {report && conf && (
        <div className="mb-6 space-y-6">
          <AdminPanel
            title="Research Confidence"
            subtitle={`${conf.label} · ${report.status} · ${report.mode}`}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
              <ScoreCell label="Overall" value={conf.overall} />
              <ScoreCell label="Source Quality" value={conf.sourceQuality} />
              <ScoreCell label="Agreement" value={conf.sourceAgreement} />
              <ScoreCell label="Freshness" value={conf.freshness} />
              <ScoreCell label="Relevance" value={conf.businessRelevance} />
              <ScoreCell label="Coverage" value={conf.evidenceCoverage} />
              <div className="rounded-lg border border-stone/25 p-2 text-center">
                <p className="font-display text-lg text-cream">{conf.unknownsCount}</p>
                <p className="text-[0.5rem] tracking-[0.08em] text-muted uppercase">Unknowns</p>
              </div>
            </div>
            {conf.singleSourceWarning && (
              <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                Warning — recommendation supported by a single source. Confidence reduced.
              </p>
            )}
            <ul className="mt-3 space-y-1 text-xs text-fog">
              {conf.why.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-cream-dim">{report.executiveSummary}</p>
            <p className="mt-2 text-[0.65rem] text-muted">
              Cost: {report.cost.label} (~{report.cost.estimatedSeconds.min}–
              {report.cost.estimatedSeconds.max}s) ·{" "}
              {report.cost.justified ? "Justified" : "Not justified for deep run"} —{" "}
              {report.cost.justification}
            </p>
          </AdminPanel>

          <AdminPanel title="Multi-source verification" subtitle="Minimum requirements">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              {(
                [
                  ["Official Documentation", report.multiSource.officialDocumentation],
                  ["Industry Research", report.multiSource.industryResearch],
                  ["Independent Analysis", report.multiSource.independentAnalysis],
                  ["Internal Business Data", report.multiSource.internalBusinessData],
                  ["Historical Performance", report.multiSource.historicalPerformance],
                  ["Current Trends", report.multiSource.currentTrends],
                ] as const
              ).map(([label, ok]) => (
                <p key={label} className={ok ? "text-emerald-300" : "text-muted"}>
                  {ok ? "✓" : "○"} {label}
                </p>
              ))}
            </div>
            {report.multiSource.warning && (
              <p className="mt-3 text-xs text-amber-200">{report.multiSource.warning}</p>
            )}
          </AdminPanel>

          {report.conflicts.length > 0 && (
            <AdminPanel title="Conflicting findings" subtitle="Disagreements explained">
              {report.conflicts.map((c) => (
                <div key={c.id} className="mb-3 text-sm">
                  <ul className="space-y-1 text-fog">
                    {c.claims.map((cl) => (
                      <li key={cl.source}>
                        <span className="text-cream">{cl.source}</span>: {cl.claim}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-cream-dim">{c.recommendation}</p>
                  <p className="mt-1 text-[0.65rem] text-muted">Confidence {c.confidence}%</p>
                </div>
              ))}
            </AdminPanel>
          )}

          {report.trends.length > 0 && (
            <AdminPanel title="Trend engine" subtitle="What matters before you ask">
              {report.trends.map((t) => (
                <div key={t.id} className="mb-3 rounded-lg border border-stone/20 p-3">
                  <div className="flex flex-wrap gap-2 text-[0.55rem] uppercase text-muted">
                    <span className="text-accent">{t.name}</span>
                    <span>{t.momentum}</span>
                    <span>{t.importance} importance</span>
                    <span>{t.confidence}% conf</span>
                  </div>
                  <p className="mt-2 text-xs text-fog">Affects: {t.affects.join(", ")}</p>
                  <p className="mt-1 text-sm text-cream">{t.recommendation}</p>
                  <p className="mt-1 text-[0.65rem] text-muted">{t.evidenceNote}</p>
                </div>
              ))}
            </AdminPanel>
          )}

          {report.opportunities.length > 0 && (
            <AdminPanel title="Strategic opportunities" subtitle="Not only problems">
              {report.opportunities.map((o) => (
                <div key={o.id} className="mb-3 text-sm">
                  <p className="text-cream">{o.title}</p>
                  <p className="mt-1 text-[0.65rem] text-muted">
                    Adoption {o.marketAdoption} · Competition {o.competition} · Fit{" "}
                    {o.estimatedFit}
                  </p>
                  <p className="mt-1 text-fog">{o.recommendation}</p>
                </div>
              ))}
            </AdminPanel>
          )}

          <AdminPanel title="Competitive intelligence" subtitle="Public information only">
            <p className="mb-3 text-xs text-fog">{report.competitive.principle}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {report.competitive.segments.map((s) => (
                <div key={s.id} className="rounded-lg border border-stone/20 p-3">
                  <p className="text-sm text-cream">{s.label}</p>
                  <p className="mt-1 text-[0.55rem] uppercase text-muted">{s.status}</p>
                  <p className="mt-1 text-[0.65rem] text-fog">{s.track.slice(0, 4).join(" · ")}</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Evidence timeline">
            <ul className="space-y-2 text-xs">
              {report.evidenceTimeline.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-20 text-muted">{e.period}</span>
                  <span className="text-cream-dim">{e.event}</span>
                </li>
              ))}
            </ul>
          </AdminPanel>

          {report.learningFromMemory.length > 0 && (
            <AdminPanel title="Research memory" subtitle="Learned from ÉLEVÉ">
              <ul className="space-y-1 text-xs text-fog">
                {report.learningFromMemory.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </AdminPanel>
          )}

          <AdminPanel title="Self-critique" subtitle="Challenge assumptions">
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <p className="text-[0.55rem] uppercase text-muted">What could make this wrong?</p>
                <ul className="mt-1 space-y-1 text-fog">
                  {report.selfCritique.whatCouldMakeThisWrong.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[0.55rem] uppercase text-muted">Missing data</p>
                <ul className="mt-1 space-y-1 text-fog">
                  {report.selfCritique.missingData.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[0.55rem] uppercase text-muted">
                  Evidence to increase confidence
                </p>
                <ul className="mt-1 space-y-1 text-fog">
                  {report.selfCritique.evidenceToIncreaseConfidence.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[0.55rem] uppercase text-muted">Verify before execution</p>
                <ul className="mt-1 space-y-1 text-fog">
                  {report.selfCritique.verifyBeforeExecution.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AdminPanel>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void recordDecision("accepted")}
              className="border border-emerald-400/40 px-3 py-1.5 text-[0.6rem] uppercase text-emerald-300"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => void recordDecision("rejected")}
              className="border border-red-400/40 px-3 py-1.5 text-[0.6rem] uppercase text-red-300"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => void recordDecision("deferred")}
              className="border border-stone/40 px-3 py-1.5 text-[0.6rem] uppercase text-muted"
            >
              Defer
            </button>
          </div>
        </div>
      )}

      <AdminPanel title="Knowledge priority" subtitle="Never reverse" className="mb-6">
        <ol className="grid gap-1 text-xs text-fog sm:grid-cols-2 lg:grid-cols-3">
          {priority.map((p, i) => (
            <li key={p}>
              <span className="text-muted">{i + 1}.</span> {p}
            </li>
          ))}
        </ol>
      </AdminPanel>

      {profiles.length > 0 && (
        <AdminPanel title="Source profiles" subtitle="Catalog authority — not live fetches" className="mb-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-lg border border-stone/20 p-3">
                <p className="text-sm text-cream">{p.name}</p>
                <p className="mt-1 text-[0.55rem] uppercase text-muted">{p.category}</p>
                <p className="mt-2 text-[0.65rem] text-fog">
                  Authority {p.authority} · Trust {p.trust} · Bias {p.bias}
                </p>
                <p className="mt-1 text-[0.65rem] text-muted">Freshness {p.freshnessLabel}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {monitor && (
        <AdminPanel
          title="Continuous intelligence"
          subtitle={monitor.connectorWired ? "Watching" : "Defined · connector offline"}
          className="mb-6"
        >
          <p className="mb-3 text-sm text-fog">{monitor.note}</p>
          <div className="flex flex-wrap gap-2">
            {monitor.items.slice(0, 12).map((item) => (
              <span
                key={item.topic}
                className="border border-stone/30 px-2 py-1 text-[0.6rem] text-muted uppercase"
              >
                {item.topic}
              </span>
            ))}
          </div>
        </AdminPanel>
      )}

      {recent.length > 0 && (
        <AdminPanel title="Recent research memory">
          <ul className="space-y-2 text-xs text-fog">
            {recent.map((r) => (
              <li key={r.id}>
                <span className="text-cream">{r.query.slice(0, 72)}</span>
                <span className="text-muted">
                  {" "}
                  · {r.status}
                  {r.researchConfidence ? ` · ${r.researchConfidence.overall}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </WorkspaceChrome>
  );
}
