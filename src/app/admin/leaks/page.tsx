"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import type { MissingMetric } from "@/lib/ai/platform/metric-owners";
import { cn } from "@/lib/utils";

interface FunnelStage {
  id: string;
  label: string;
  count: number | null;
  dropOffPct: number | null;
  evidence: string[];
  potentialCause: string | null;
  confidence: number;
  historicalOutcome: string | null;
  suggestedFix: { id: string; label: string; href: string } | null;
  estimatedLoss: number;
  lossTruthKind: "AI Prediction" | "Payments Verified" | "Unknown";
  missing: MissingMetric | null;
}

interface Leak {
  id: string;
  title: string;
  reason: string;
  category: string;
  estimatedLoss: number;
  recoveryPotential: number;
  confidence: number;
  evidence: string[];
  actions: { id: string; label: string; href: string }[];
  formula?: string;
  funnelStageId?: string;
}

export default function LeaksPage() {
  useSetAIPage("risks");
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [exposure, setExposure] = useState({
    loss: 0,
    recoverable: 0,
    disclaimer: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/ai/leaks");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLeaks(data.leaks ?? []);
      setFunnel(data.funnel ?? []);
      setExposure({
        loss: data.exposure?.loss ?? 0,
        recoverable: data.exposure?.recoverable ?? 0,
        disclaimer:
          data.exposure?.disclaimer ??
          "AI Prediction only — heuristic coefficients, not audited recoverable revenue.",
      });
    } catch {
      setError("Could not load revenue leaks.");
      setLeaks([]);
      setFunnel([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell title="Revenue Leaks">
      <WorkspaceChrome
        eyebrow="Command · Where are we losing money?"
        title="Revenue Leak Detector"
        description="Full funnel Traffic → Paid. Every stage always shown. Dollar figures are AI Predictions unless Payments-verified — never invented ledger loss."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Risks", href: "/admin/risks", desc: "Threats" },
          { label: "Workboard", href: "/admin/workboard", desc: "Act" },
          { label: "Payments", href: "/admin/financial", desc: "Ledger" },
          { label: "Briefing", href: "/admin/briefing", desc: "Report" },
        ]}
      >
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-fog">
          {exposure.disclaimer}
        </div>
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <AdminPanel title="Potential loss (AI Prediction)">
            <p className="font-display text-3xl text-amber-300">
              {exposure.loss > 0 ? `$${Math.round(exposure.loss).toLocaleString()}` : "—"}
            </p>
            <p className="mt-1 text-[0.65rem] text-muted">
              {exposure.loss > 0 ? "Heuristic · not ledger" : "More financial data required"}
            </p>
          </AdminPanel>
          <AdminPanel title="Recoverable (AI Prediction)">
            <p className="font-display text-3xl text-emerald-400">
              {exposure.recoverable > 0
                ? `$${Math.round(exposure.recoverable).toLocaleString()}`
                : "—"}
            </p>
            <p className="mt-1 text-[0.65rem] text-muted">
              {exposure.recoverable > 0
                ? "Confidence-weighted heuristic"
                : "More financial data required"}
            </p>
          </AdminPanel>
        </div>

        {loading && funnel.length === 0 && leaks.length === 0 ? (
          <WorkspaceLoading />
        ) : error && funnel.length === 0 && leaks.length === 0 ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-3 font-display text-xl text-cream">Revenue funnel</h2>
              <p className="mb-4 text-sm text-fog">
                Traffic → Portfolio → Booking → Inquiry → Consultation → Contract → Deposit →
                Completed → Paid
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {funnel.map((stage) =>
                  stage.missing ? (
                    <MissingMetricCard key={stage.id} missing={stage.missing} />
                  ) : (
                    <article
                      key={stage.id}
                      className="rounded-xl border border-stone/20 bg-ink/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                          {stage.label}
                        </p>
                        <span className="text-[0.5rem] tracking-[0.08em] text-muted uppercase">
                          {stage.lossTruthKind}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-2xl text-cream">
                        {stage.count != null ? stage.count.toLocaleString() : "—"}
                      </p>
                      <p className="mt-1 text-[0.65rem] text-muted">
                        {stage.dropOffPct != null
                          ? `${stage.dropOffPct}% drop-off from prior`
                          : "Drop-off n/a"}
                        {" · "}
                        {Math.round(stage.confidence * 100)}% confidence
                      </p>
                      {stage.potentialCause && (
                        <p className="mt-2 text-xs text-amber-200/90">{stage.potentialCause}</p>
                      )}
                      {stage.evidence[0] && (
                        <p className="mt-2 text-[0.7rem] text-fog">{stage.evidence[0]}</p>
                      )}
                      {stage.historicalOutcome && (
                        <p className="mt-1 text-[0.65rem] text-muted">
                          Outcome · {stage.historicalOutcome}
                        </p>
                      )}
                      {stage.suggestedFix && (
                        <div className="mt-3">
                          <ExecuteButton
                            target={{
                              id: `funnel-${stage.id}`,
                              title: stage.suggestedFix.label,
                              href: stage.suggestedFix.href,
                              actionLabel: stage.suggestedFix.label,
                            }}
                            className="text-[0.65rem]"
                          />
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-display text-xl text-cream">Detected leaks</h2>
              {leaks.length === 0 ? (
                <WorkspaceEmpty
                  title="No actionable leaks above threshold"
                  detail="Funnel stages above still show measured counts or MissingMetric unlock paths. Check Risks for related exposure."
                  actionHref="/admin/risks"
                  actionLabel="Open risks"
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {leaks.map((leak) => (
                    <article
                      key={leak.id}
                      className="os-panel rounded-xl border border-stone/20 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                          {leak.funnelStageId
                            ? `${leak.category} · ${leak.funnelStageId}`
                            : leak.category}
                        </span>
                        <p className="font-display text-xl text-amber-300">
                          {leak.estimatedLoss > 0
                            ? `~$${leak.estimatedLoss.toLocaleString()}`
                            : "—"}
                        </p>
                      </div>
                      <h3 className="mt-2 font-display text-lg text-cream">{leak.title}</h3>
                      <p className="mt-2 text-sm text-fog">{leak.reason}</p>
                      <p className="mt-2 text-[0.65rem] text-muted">
                        {leak.estimatedLoss > 0 || leak.recoveryPotential > 0
                          ? `AI Prediction recovery ~$${leak.recoveryPotential.toLocaleString()} · ${Math.round(leak.confidence * 100)}% confidence`
                          : `More financial data required · ${Math.round(leak.confidence * 100)}% confidence`}
                      </p>
                      {leak.formula && (
                        <p className="mt-1 text-[0.6rem] text-muted">Formula: {leak.formula}</p>
                      )}
                      {leak.evidence.length > 0 && (
                        <ul className="mt-3 space-y-1 text-[0.7rem] text-muted">
                          {leak.evidence.slice(0, 4).map((e) => (
                            <li key={e}>• {e}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {leak.actions[0] && (
                          <ExecuteButton
                            target={{
                              id: leak.id,
                              title: leak.title,
                              href: leak.actions[0].href,
                              actionLabel: leak.actions[0].label,
                            }}
                            className={cn("text-[0.65rem]")}
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
