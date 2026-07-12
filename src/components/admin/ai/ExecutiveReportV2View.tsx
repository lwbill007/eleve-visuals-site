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
          <section>
            <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">
              Scenario Simulator
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {report.strategies.map((s) => (
                <div key={s.id} className="rounded-xl border border-stone/25 p-4">
                  <p className="font-display text-lg text-cream">{s.label}</p>
                  <p className="mt-2 text-xs text-fog">{s.summary}</p>
                  <p className="mt-3 text-[0.65rem] text-muted">
                    Investment {s.investment} · Risk {s.risk} · Confidence {s.confidence}%
                  </p>
                  <p className="mt-1 text-[0.65rem] text-fog">{s.expectedOutcome}</p>
                </div>
              ))}
            </div>
          </section>

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
