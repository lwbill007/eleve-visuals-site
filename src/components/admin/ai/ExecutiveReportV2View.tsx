"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  truthToneClass,
  type ExecutiveReportV3,
  type ReportRecommendation,
  type ReportTruthKind,
} from "@/lib/ai/platform/executive-report-v2";
import { SOURCE_RELIABILITY_CATALOG } from "@/lib/ai/reasoning/source-reliability";

type RecSort = "priority" | "impact" | "effort" | "confidence";

function TruthBadge({ kind }: { kind: ReportTruthKind }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 text-[0.55rem] tracking-[0.08em] uppercase",
        truthToneClass(kind)
      )}
    >
      {kind}
    </span>
  );
}

function priorityTone(p: string) {
  if (p === "critical") return "border-red-400/50 text-red-300 bg-red-400/10";
  if (p === "high") return "border-amber-400/45 text-amber-200 bg-amber-400/10";
  if (p === "medium") return "border-accent/40 text-accent bg-accent/10";
  return "border-stone/40 text-muted";
}

function trendLabel(t: string) {
  if (t === "up") return "↑ 30d";
  if (t === "down") return "↓ 30d";
  if (t === "flat") return "→ 30d";
  return "— 30d";
}

function sortRecs(recs: ReportRecommendation[], sort: RecSort) {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const effortRank = { low: 0, medium: 1, high: 2 };
  return [...recs].sort((a, b) => {
    if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
    if (sort === "impact") return b.businessImpact - a.businessImpact;
    if (sort === "effort") return effortRank[a.effort] - effortRank[b.effort];
    return b.confidence - a.confidence;
  });
}

export function ExecutiveReportV2View({
  report,
  compact = false,
}: {
  report: ExecutiveReportV3;
  compact?: boolean;
}) {
  const [sort, setSort] = useState<RecSort>("priority");
  const [openId, setOpenId] = useState<string | null>(null);

  const recs = useMemo(() => sortRecs(report.recommendations, sort), [report.recommendations, sort]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/5 via-transparent to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-accent">
              Executive Intelligence Platform v{report.version}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cream-dim">
              {report.executiveSummary}
            </p>
          </div>
          <div className="text-right text-[0.65rem] text-muted">
            <p>Overall confidence {report.confidence.overall}%</p>
            <p className="mt-0.5">{new Date(report.generatedAt).toLocaleString()}</p>
          </div>
        </div>
        <p className="mt-3 text-[0.7rem] text-fog">{report.disclaimer}</p>
      </section>

      <section>
        <p className="mb-2 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
          Intelligence hierarchy
        </p>
        <div className="flex flex-wrap gap-2 text-[0.65rem]">
          <TruthBadge kind="Measured Data" />
          <TruthBadge kind="AI Analysis" />
          <TruthBadge kind="Verified External Research" />
          <TruthBadge kind="AI Prediction" />
          <span className="border border-stone/30 px-1.5 py-0.5 text-muted uppercase">
            Recommendations
          </span>
        </div>
      </section>

      {report.overnightBrief && (
        <section className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
          <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">
            Executive Briefing
          </p>
          <p className="mt-2 font-display text-xl text-cream">
            {report.overnightBrief.doFirst || "Review Command Center"}
          </p>
          <p className="mt-1 text-[0.65rem] text-muted">Do first · everything else ranked below</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["What changed overnight?", report.overnightBrief.whatChangedOvernight],
                ["Requires attention today", report.overnightBrief.requiresAttentionToday],
                ["Opportunities appeared", report.overnightBrief.opportunitiesAppeared],
                ["Risks increased", report.overnightBrief.risksIncreased],
                ["Decisions waiting", report.overnightBrief.decisionsWaiting],
              ] as const
            ).map(([label, items]) => (
              <div key={label} className="rounded-lg border border-stone/20 p-3">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</p>
                <ul className="mt-2 space-y-1 text-xs text-fog">
                  {items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.liveHealth && (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">
                Live Business Health
              </p>
              <p className="mt-1 font-display text-3xl text-cream">
                {report.liveHealth.overall != null ? report.liveHealth.overall : "—"}
              </p>
            </div>
            <p className="max-w-md text-[0.65rem] text-fog">{report.liveHealth.disclaimer}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {report.liveHealth.components.map((c) => (
              <div key={c.id} className="rounded-xl border border-stone/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{c.label}</p>
                  <span className={cn("border px-1 text-[0.5rem] uppercase", priorityTone(c.priority))}>
                    {c.priority}
                  </span>
                </div>
                <p className="mt-1 font-display text-xl text-cream">
                  {c.score != null ? c.score : "—"}
                </p>
                <p className="mt-1 text-[0.65rem] text-fog">{c.explain}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[0.55rem] text-muted">{trendLabel(c.trend)}</span>
                  <TruthBadge kind={c.truthKind} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.intelligenceGraph && !compact && (
        <section>
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
            Intelligence Graph
          </p>
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-2">
            {report.intelligenceGraph.nodes.map((n, i) => (
              <div key={n.id} className="flex items-center gap-1">
                <div
                  className={cn(
                    "min-w-[7.5rem] rounded-lg border px-2.5 py-2",
                    n.status === "critical"
                      ? "border-red-400/40"
                      : n.status === "watch"
                        ? "border-amber-400/40"
                        : "border-stone/25"
                  )}
                >
                  <p className="text-[0.55rem] tracking-[0.08em] text-muted uppercase">{n.label}</p>
                  <p className="mt-0.5 text-[0.65rem] text-cream">{n.metric || "—"}</p>
                  <div className="mt-1">
                    <TruthBadge kind={n.truthKind} />
                  </div>
                </div>
                {i < report.intelligenceGraph!.nodes.length - 1 && (
                  <span className="px-0.5 text-muted">↓</span>
                )}
              </div>
            ))}
          </div>
          {report.intelligenceGraph.downstreamAlerts.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-200/90">
              {report.intelligenceGraph.downstreamAlerts.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
          Executive Dashboard
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {report.dashboard.map((d) => (
            <div key={d.id} className="rounded-xl border border-stone/25 p-3">
              <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{d.label}</p>
              <p className="mt-1 font-display text-xl text-cream">
                {d.score != null ? d.score : "—"}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-fog">{d.scoreLabel}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[0.55rem] text-muted">{trendLabel(d.trend30d)}</span>
                <span className="text-[0.55rem] text-muted">{d.confidence}% conf</span>
                <span className={cn("border px-1 text-[0.5rem] uppercase", priorityTone(d.priority))}>
                  {d.priority}
                </span>
                <TruthBadge kind={d.truthKind} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {!compact && (
        <section>
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Data Sources</p>
          <div className="flex flex-wrap gap-2">
            {report.dataSources.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  s.present ? "border-emerald-400/30 text-cream" : "border-stone/25 text-muted"
                )}
              >
                <span className="mr-1.5">{s.present ? "✓" : "○"}</span>
                {s.label}
                <p className="mt-0.5 text-[0.65rem] text-fog">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
          Layer 1 — Measured Facts
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {report.measuredSituation.map((m) => (
            <div key={m.id} className="rounded-lg border border-stone/20 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{m.label}</p>
                <TruthBadge kind={m.truthKind} />
              </div>
              <p className="mt-1 text-sm text-cream">{m.value}</p>
              {m.note && <p className="mt-0.5 text-[0.65rem] text-fog">{m.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {!compact && report.rootCauses.length > 0 && (
        <section>
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
            Layer 2 — AI Analysis
          </p>
          <div className="space-y-3">
            {report.rootCauses.map((h) => (
              <div key={h.id} className="rounded-xl border border-accent/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TruthBadge kind="AI Analysis" />
                  <span className="text-[0.65rem] text-muted">{h.confidence}% confidence</span>
                </div>
                <p className="mt-2 text-sm text-cream">{h.hypothesis}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <p className="text-muted uppercase text-[0.55rem]">Supporting</p>
                    <ul className="mt-1 space-y-1 text-fog">
                      {h.supportingEvidence.map((e) => (
                        <li key={e}>• {e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-muted uppercase text-[0.55rem]">Missing</p>
                    <ul className="mt-1 space-y-1 text-fog">
                      {h.missingEvidence.map((e) => (
                        <li key={e}>• {e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-muted uppercase text-[0.55rem]">Alternatives</p>
                    <ul className="mt-1 space-y-1 text-fog">
                      {h.alternatives.map((e) => (
                        <li key={e}>• {e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!compact && (
        <section>
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
            Layer 3 — Verified External Research
          </p>
          {(report.layers?.verifiedExternalResearch ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border border-stone/20 p-3 text-sm text-fog">
              {r.present ? (
                <>
                  <TruthBadge kind="Verified External Research" />
                  <p className="mt-2 text-cream">{r.summary}</p>
                  <p className="mt-1 text-[0.65rem]">
                    {r.source}
                    {r.publicationDate ? ` · ${r.publicationDate}` : ""} · {r.confidence}% conf
                  </p>
                </>
              ) : (
                <>
                  <TruthBadge kind="Unknown (More Data Required)" />
                  <p className="mt-2">{r.summary}</p>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {!compact && (report.predictions?.length ?? 0) > 0 && (
        <section>
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
            Layer 4 — AI Predictions
          </p>
          <div className="space-y-2">
            {report.predictions.map((p) => (
              <div key={p.id} className="rounded-xl border border-amber-400/25 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TruthBadge kind="AI Prediction" />
                  <span className="text-[0.65rem] text-muted">{p.confidence}% confidence</span>
                </div>
                <p className="mt-2 text-sm text-cream">{p.potentialOutcome}</p>
                <p className="mt-1 text-xs text-fog">
                  <span className="text-muted">Estimated impact: </span>
                  {p.estimatedImpact}
                </p>
                <p className="mt-1 text-xs text-fog">
                  <span className="text-muted">Reasoning: </span>
                  {p.reasoning}
                </p>
                <p className="mt-1 text-[0.65rem] text-muted">
                  Depends: {p.dependencies.join(", ")} · Variables: {p.variables.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!compact && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
              Opportunity Engine
            </p>
            <div className="space-y-2">
              {report.opportunities.map((o) => (
                <div key={o.id} className="rounded-lg border border-stone/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-cream">{o.title}</p>
                    <TruthBadge kind={o.truthKind} />
                  </div>
                  <p className="mt-1 text-xs text-fog">{o.reasoning}</p>
                  <p className="mt-2 text-[0.65rem] text-amber-200/90">
                    Financial: {o.financialProjection}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-muted">
                    Score {o.opportunityScore} · Impact {o.businessImpact} · Confidence{" "}
                    {o.confidence}% · Effort {o.estimatedEffort} · TTV {o.timeToValue}
                  </p>
                </div>
              ))}
              {report.opportunities.length === 0 && (
                <p className="text-sm text-muted">Not enough data available.</p>
              )}
            </div>
          </section>

          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Risk Engine</p>
            <div className="space-y-2">
              {report.risks.map((r) => (
                <div key={r.id} className="rounded-lg border border-stone/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.55rem] uppercase text-amber-300">{r.category}</span>
                    <TruthBadge kind={r.truthKind} />
                  </div>
                  <p className="mt-1 text-sm text-cream">{r.title}</p>
                  <p className="mt-1 text-[0.65rem] text-muted">
                    Likelihood {r.likelihood} · Severity {r.severity} · Confidence {r.confidence}%
                  </p>
                  <p className="mt-1 text-xs text-fog">
                    Mitigation: {r.mitigation} · {r.owner} · {r.timeline}
                  </p>
                </div>
              ))}
              {report.risks.length === 0 && (
                <p className="text-sm text-muted">No material risks flagged from measured signals.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">
            Layer 5 — Executive Recommendations
          </p>
          <div className="flex flex-wrap gap-1">
            {(["priority", "impact", "effort", "confidence"] as RecSort[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={cn(
                  "border px-2 py-0.5 text-[0.55rem] uppercase",
                  sort === s ? "border-accent text-accent" : "border-stone/30 text-muted"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone/25">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-stone/25 text-[0.55rem] tracking-[0.1em] text-muted uppercase">
              <tr>
                <th className="px-3 py-2">Recommendation</th>
                <th className="px-3 py-2">Impact</th>
                <th className="px-3 py-2">Effort</th>
                <th className="px-3 py-2">Confidence</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-stone/15 hover:bg-cream/[0.02]"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  <td className="px-3 py-2.5 text-cream">{r.title}</td>
                  <td className="px-3 py-2.5 text-fog">{r.businessImpact}</td>
                  <td className="px-3 py-2.5 text-fog">{r.effort}</td>
                  <td className="px-3 py-2.5 text-fog">{r.confidence}%</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("border px-1.5 py-0.5 uppercase", priorityTone(r.priority))}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recs.map((r) =>
          openId === r.id ? (
            <div key={`detail-${r.id}`} className="mt-3 rounded-xl border border-accent/25 p-4">
              <p className="text-sm text-cream">{r.title}</p>
              <p className="mt-2 text-xs text-fog">
                <span className="text-muted">Business problem: </span>
                {r.businessProblem}
              </p>
              <p className="mt-1 text-xs text-fog">
                <span className="text-muted">Why: </span>
                {r.whyImportant}
              </p>
              <p className="mt-1 text-xs text-fog">
                <span className="text-muted">If ignored: </span>
                {r.ifNothingChanges}
              </p>
              <p className="mt-1 text-xs text-fog">
                <span className="text-muted">What next: </span>
                {r.whatNext}
              </p>
              <p className="mt-1 text-xs text-fog">
                <span className="text-muted">Success metric: </span>
                {r.successMetric}
              </p>
              <p className="mt-1 text-xs text-fog">
                <span className="text-muted">Owner · Timeline · Automation: </span>
                {r.owner} · {r.timeline} · {r.automationAvailable ? "Available" : "Manual"} ·
                Approval required
              </p>

              <div className="mt-3">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Evidence Engine</p>
                <ul className="mt-2 space-y-1.5">
                  {r.evidence.map((e, i) => (
                    <li key={`${r.id}-ev-${i}`} className="flex flex-wrap items-start gap-2 text-xs">
                      <TruthBadge kind={e.kind} />
                      <span className="text-cream-dim">{e.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {r.decisionTrace && (
                <div className="mt-4 rounded-lg border border-accent/20 bg-accent/[0.03] p-3">
                  <p className="text-[0.55rem] tracking-[0.1em] text-accent uppercase">
                    Decision Trace
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Observed</p>
                      <ul className="mt-1 space-y-1 text-fog">
                        {r.decisionTrace.observed.map((o) => (
                          <li key={o.text} className="flex flex-wrap gap-1.5">
                            <span>• {o.text}</span>
                            <TruthBadge kind={o.truthKind} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Evidence</p>
                      <ul className="mt-1 space-y-1 text-fog">
                        {r.decisionTrace.evidenceSources.map((e) => (
                          <li key={e.label}>
                            {e.present ? "✓" : "○"} {e.label}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[0.55rem] text-muted uppercase">Research</p>
                      <ul className="mt-1 space-y-1 text-fog">
                        {r.decisionTrace.researchSources.map((e) => (
                          <li key={e.label}>
                            {e.present ? "✓" : "○"} {e.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Reasoning</p>
                      <p className="mt-1 text-cream-dim">{r.decisionTrace.reasoning}</p>
                      <p className="mt-2 text-[0.65rem] text-muted">
                        Confidence {r.decisionTrace.confidence}% · Impact{" "}
                        {r.decisionTrace.businessImpact}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-[0.65rem] text-fog">
                        {r.decisionTrace.confidenceWhy.map((w) => (
                          <li key={w}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {r.selfAudit && (
                <div className="mt-3 rounded-lg border border-stone/25 p-3">
                  <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Self Audit</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-fog">
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Weaknesses</p>
                      <ul className="mt-1 space-y-1">
                        {r.selfAudit.potentialWeaknesses.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Missing data</p>
                      <ul className="mt-1 space-y-1">
                        {r.selfAudit.missingData.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[0.55rem] text-muted uppercase">Verify</p>
                      <ul className="mt-1 space-y-1">
                        {r.selfAudit.recommendedVerification.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {(r.assumptions.length > 0 || r.missingInfo.length > 0) && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <p className="text-[0.55rem] text-muted uppercase">Assumptions</p>
                    <ul className="mt-1 space-y-1 text-fog">
                      {r.assumptions.map((a) => (
                        <li key={a}>• {a}</li>
                      ))}
                      {r.assumptions.length === 0 && <li className="text-muted">None listed</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[0.55rem] text-muted uppercase">Unknowns</p>
                    <ul className="mt-1 space-y-1 text-fog">
                      {r.missingInfo.map((a) => (
                        <li key={a}>• {a}</li>
                      ))}
                      {r.missingInfo.length === 0 && <li className="text-muted">None listed</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {r.actions.map((a) =>
                  a.href ? (
                    <Link
                      key={a.id}
                      href={a.href}
                      className="border border-accent/40 bg-accent/10 px-2.5 py-1 text-[0.6rem] tracking-[0.08em] text-accent uppercase"
                    >
                      {a.label}
                      {a.requiresApproval ? " · approval" : ""}
                    </Link>
                  ) : (
                    <span
                      key={a.id}
                      className="border border-stone/30 px-2.5 py-1 text-[0.6rem] tracking-[0.08em] text-muted uppercase"
                      title="Human approval gate — no auto-execute"
                    >
                      {a.label}
                      {a.requiresApproval ? " · approval" : ""}
                    </span>
                  )
                )}
              </div>
            </div>
          ) : null
        )}
      </section>

      {!compact && (
        <>
          {report.executiveDebate && (
            <section>
              <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
                Executive Debate
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {report.executiveDebate.voices.map((v) => (
                  <div key={v.role} className="rounded-xl border border-stone/25 p-4">
                    <p className="text-[0.55rem] tracking-[0.1em] text-accent uppercase">{v.role}</p>
                    <p className="mt-2 text-sm text-cream">{v.position}</p>
                    <p className="mt-2 text-xs text-fog">
                      <span className="text-muted">Concern: </span>
                      {v.concern}
                    </p>
                    <div className="mt-2">
                      <TruthBadge kind={v.truthKind} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.04] p-4">
                <p className="text-[0.55rem] tracking-[0.1em] text-accent uppercase">
                  CEO Recommendation
                </p>
                <p className="mt-2 text-sm text-cream">{report.executiveDebate.ceoRecommendation}</p>
                <p className="mt-1 text-[0.65rem] text-muted">
                  Confidence {report.executiveDebate.confidence}%
                </p>
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
              Scenario Simulator
            </p>
            {report.scenarioSimulation && (
              <p className="mb-3 text-xs text-fog">
                <span className="text-muted">Recommended order: </span>
                {report.scenarioSimulation.recommendationOrder
                  .map(
                    (id) =>
                      report.scenarioSimulation!.scenarios.find((s) => s.id === id)?.label ?? id
                  )
                  .join(" → ")}
                <span className="text-muted">
                  {" "}
                  · {report.scenarioSimulation.confidence}% conf
                </span>
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              {(report.scenarioSimulation?.scenarios ?? report.strategies).map((s) => {
                const impact =
                  "estimatedImpact" in s && s.estimatedImpact ? s.estimatedImpact : null;
                const investment = "investment" in s ? s.investment : null;
                const expected = "expectedOutcome" in s ? s.expectedOutcome : null;
                return (
                  <div key={s.id} className="rounded-xl border border-stone/25 p-4">
                    <p className="font-display text-lg text-cream">{s.label}</p>
                    <p className="mt-2 text-xs text-fog">{s.summary}</p>
                    {impact && (
                      <p className="mt-3 text-[0.65rem] text-cream">
                        Estimated impact: {impact}
                      </p>
                    )}
                    <p className="mt-1 text-[0.65rem] text-muted">
                      {investment
                        ? `Investment ${investment} · Risk ${s.risk} · Confidence ${s.confidence}%`
                        : `Risk ${s.risk} · Confidence ${s.confidence}%`}
                    </p>
                    {expected && (
                      <p className="mt-1 text-[0.65rem] text-fog">{expected}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {report.scenarioSimulation?.reasoning && (
              <p className="mt-3 text-xs text-fog">{report.scenarioSimulation.reasoning}</p>
            )}
          </section>

          {(report.predictionValidations?.length ?? 0) > 0 && (
            <section>
              <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
                Prediction Validation
              </p>
              <div className="space-y-2">
                {report.predictionValidations!.map((p) => (
                  <div key={p.id} className="rounded-xl border border-stone/25 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-cream">{p.subject}</p>
                      <TruthBadge kind={p.truthKind} />
                      <span className="text-[0.55rem] uppercase text-muted">{p.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-fog">
                      <span className="text-muted">Predicted: </span>
                      {p.predicted}
                    </p>
                    <p className="mt-1 text-xs text-fog">
                      <span className="text-muted">Actual: </span>
                      {p.actual ?? "Awaiting measurement"}
                    </p>
                    {p.accuracy != null && (
                      <p className="mt-1 text-xs text-cream">Accuracy {p.accuracy}%</p>
                    )}
                    {p.learning && (
                      <p className="mt-1 text-[0.65rem] text-muted">Learning: {p.learning}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
              Executive Action Plan
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {report.actionPlan.map((bucket) => (
                <div key={bucket.horizon} className="rounded-xl border border-stone/25 p-3">
                  <p className="text-[0.55rem] tracking-[0.1em] text-accent uppercase">
                    {bucket.label}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {bucket.items.map((item, i) => (
                      <li key={`${bucket.horizon}-${i}`} className="text-xs">
                        <p className="text-cream">{item.title}</p>
                        <p className="mt-0.5 text-muted">{item.owner}</p>
                        <div className="mt-1">
                          <TruthBadge kind={item.truthKind} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">AI Confidence</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {(
                [
                  ["Business", report.confidence.business],
                  ["Marketing", report.confidence.marketing],
                  ["SEO", report.confidence.seo],
                  ["UX", report.confidence.ux],
                  ["Technical", report.confidence.technical],
                  ["Financial", report.confidence.financial],
                  ["Creative", report.confidence.creative],
                  ["Overall", report.confidence.overall],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-stone/25 p-2 text-center">
                  <p className="font-display text-lg text-cream">{value}</p>
                  <p className="text-[0.55rem] tracking-[0.08em] text-muted uppercase">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-fog">
              {report.confidence.reasoning.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </section>

          {report.selfAudit && (
            <section className="rounded-xl border border-stone/25 p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">AI Self-Audit</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs text-fog">
                {(
                  [
                    ["Potential weaknesses", report.selfAudit.potentialWeaknesses],
                    ["Missing data", report.selfAudit.missingData],
                    ["Alternative explanations", report.selfAudit.alternativeExplanations],
                    ["Research limitations", report.selfAudit.researchLimitations],
                    ["Assumptions", report.selfAudit.assumptions],
                    ["Recommended verification", report.selfAudit.recommendedVerification],
                  ] as const
                ).map(([label, items]) => (
                  <div key={label}>
                    <p className="text-[0.55rem] text-muted uppercase">{label}</p>
                    <ul className="mt-1 space-y-1">
                      {items.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
              Source Reliability Engine
            </p>
            <p className="mb-3 text-[0.65rem] text-fog">
              Confidence derives from authority, freshness, bias, and historical accuracy — not
              assigned by hand.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SOURCE_RELIABILITY_CATALOG.map((s) => (
                <div key={s.id} className="rounded-lg border border-stone/20 p-3">
                  <p className="text-sm text-cream">{s.name}</p>
                  <p className="mt-1 text-[0.55rem] uppercase text-muted">{s.category}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[0.65rem] text-fog">
                    <span>Authority {s.authority}</span>
                    <span>Freshness {s.freshness}</span>
                    <span>Bias {s.bias}</span>
                    <span>Accuracy {s.historicalAccuracy}</span>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-accent">Trust {s.trustScore}</p>
                  <p className="mt-0.5 text-[0.55rem] text-muted">
                    Expires ~{s.expiresInDays}d · {s.freshnessLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {report.learningNote && (
            <section className="rounded-xl border border-stone/25 p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Learning Engine</p>
              <p className="mt-2 text-sm text-fog">{report.learningNote}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
