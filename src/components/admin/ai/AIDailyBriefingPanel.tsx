"use client";

import Link from "next/link";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { ExecutiveInsightCard } from "@/components/admin/os/ExecutiveOSComponents";
import { ExecutiveReportV2View } from "@/components/admin/ai/ExecutiveReportV2View";

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
      <p className="text-[0.55rem] tracking-[0.16em] text-accent uppercase">
        {step} · {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone/30">
        <span className="font-display text-base text-cream">{value}</span>
      </div>
      <p className="mt-1.5 text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
    </div>
  );
}

export function AIDailyBriefingPanel({ compact = false }: { compact?: boolean }) {
  const ctx = useBriefingOptional();
  const briefing = ctx?.briefing;
  const loading = ctx?.loading ?? true;
  const refresh = ctx?.refresh;

  if (loading && !briefing) {
    return (
      <div className="os-glass animate-pulse rounded-2xl border border-accent/20 p-6" aria-busy="true">
        <div className="h-5 w-48 rounded bg-stone/30" />
        <div className="mt-4 h-24 rounded bg-stone/20" />
      </div>
    );
  }

  if (!briefing) return null;

  const contract = briefing.commandContract;

  if (!compact && contract) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-accent">AI Briefing · Why did it happen?</p>
            <h2 className="mt-2 font-display text-xl text-cream">{briefing.ceoHeadline}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cream-dim">
              {briefing.summary}
            </p>
            <p className="mt-2 text-xs text-muted">
              Updated {new Date(briefing.generatedAt).toLocaleString()}
              {briefing.provider !== "rules" && ` · ${briefing.provider}`}
            </p>
          </div>
          <div className="flex gap-2">
            {refresh && (
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border border-stone/30 px-3 py-2 text-xs text-fog uppercase hover:border-accent"
              >
                Refresh
              </button>
            )}
            <Link
              href="/admin"
              className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.1em] text-cream uppercase hover:border-accent"
            >
              Home
            </Link>
          </div>
        </div>

        <Section step="01" title="Measured Facts">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {contract.measuredFacts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-stone/20 p-3">
                <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                  {fact.label}
                </p>
                <p className="mt-1 font-display text-2xl text-cream">{fact.value}</p>
                <p className="mt-1 text-[0.62rem] text-fog">{fact.evidence[0]}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section step="02" title="What Changed">
          <div className="space-y-3">
            {contract.whatChanged.map((item) => (
              <div key={item.label}>
                <p className="text-sm text-cream">{item.label}</p>
                <p className="mt-1 text-sm text-fog">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section step="03" title="Why It Changed">
          <div className="space-y-3">
            {contract.why.map((item) => (
              <div key={item.statement}>
                <p className="text-sm leading-relaxed text-cream">{item.statement}</p>
                <ul className="mt-2 space-y-0.5">
                  {item.evidence.map((e) => (
                    <li key={e} className="text-[0.65rem] text-muted">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section step="04" title="Evidence">
          <ul className="space-y-1">
            {contract.evidence.map((e) => (
              <li key={e} className="text-sm text-fog">
                • {e}
              </li>
            ))}
          </ul>
        </Section>

        <Section step="05" title="Predictions">
          <div className="space-y-3">
            {contract.predictions.map((p) => (
              <div key={p.id} className="rounded-lg border border-violet-400/20 bg-violet-400/[0.04] p-3">
                <p className="text-sm text-cream">{p.prediction}</p>
                <p className="mt-2 text-xs text-violet-200">
                  Probability {Math.round(p.probability * 100)}% · Confidence{" "}
                  {Math.round(p.confidence * 100)}%
                </p>
                <p className="mt-2 text-[0.65rem] text-fog">
                  Supported by: {p.reasons.join(" · ")}
                </p>
                <p className="mt-1 text-[0.65rem] text-amber-200">
                  Unknowns: {p.unknowns.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section step="06" title="Recommendations">
          <div className="space-y-3">
            {contract.recommendations.length === 0 ? (
              <p className="text-sm text-muted">
                No evidence-backed recommendations yet.
              </p>
            ) : (
              contract.recommendations.map((r) => (
                <div key={r.id} className="rounded-lg border border-stone/20 p-3">
                  <p className="text-sm text-cream">{r.recommendation}</p>
                  <p className="mt-1 text-xs text-fog">{r.problem}</p>
                  <p className="mt-2 text-[0.65rem] text-muted">
                    Confidence {Math.round(r.confidence * 100)}% · {r.timeRequiredMinutes}m ·{" "}
                    {r.owner} · {r.successMetric}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {r.evidence.slice(0, 3).map((e) => (
                      <li key={e} className="text-[0.65rem] text-fog">
                        Evidence · {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section step="07" title="Confidence">
          <p className="font-display text-3xl text-cream">
            {Math.round(contract.confidence.overall * 100)}%
          </p>
          <ul className="mt-2 space-y-1">
            {contract.confidence.why.map((w) => (
              <li key={w} className="text-sm text-fog">
                • {w}
              </li>
            ))}
          </ul>
        </Section>

        <Section step="08" title="Actions">
          <div className="flex flex-wrap gap-2">
            {contract.actions.length === 0 ? (
              <p className="text-sm text-muted">No actions available.</p>
            ) : (
              contract.actions.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="rounded-lg bg-cream px-3 py-2 text-[0.65rem] tracking-wider text-ink uppercase"
                  title={a.evidence.join(" · ")}
                >
                  {a.label}
                </Link>
              ))
            )}
            <Link
              href="/admin/opportunities"
              className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase"
            >
              Open opportunities
            </Link>
          </div>
        </Section>

        {briefing.reportV2 && (
          <details className="rounded-2xl border border-stone/20 p-4">
            <summary className="cursor-pointer text-xs tracking-[0.12em] text-muted uppercase">
              Extended report v2
            </summary>
            <div className="mt-4">
              <ExecutiveReportV2View report={briefing.reportV2} />
            </div>
          </details>
        )}
      </section>
    );
  }

  if (!compact && briefing.reportV2) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-accent">CEO Briefing</p>
            <h2 className="mt-2 font-display text-xl text-cream">{briefing.ceoHeadline}</h2>
            <p className="mt-2 text-xs text-muted">
              Updated {new Date(briefing.generatedAt).toLocaleString()}
              {briefing.provider !== "rules" && ` · ${briefing.provider}`}
            </p>
          </div>
          <div className="flex gap-2">
            {refresh && (
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border border-stone/30 px-3 py-2 text-xs text-fog uppercase hover:border-accent"
              >
                Refresh
              </button>
            )}
            <Link
              href="/admin"
              className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.1em] text-cream uppercase hover:border-accent"
            >
              Home
            </Link>
          </div>
        </div>
        <ExecutiveReportV2View report={briefing.reportV2} />
      </section>
    );
  }

  return (
    <section className="os-glass rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-charcoal/20 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-accent">CEO Briefing</p>
          <h2 className="mt-2 font-display text-xl text-cream">{briefing.ceoHeadline}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cream-dim">{briefing.summary}</p>
          <p className="mt-2 text-xs text-muted">
            Updated {new Date(briefing.generatedAt).toLocaleString()}
            {briefing.provider !== "rules" && ` · ${briefing.provider}`}
          </p>
        </div>
        <div className="flex gap-4">
          <ScoreRing label="Health" value={briefing.scores.businessHealth} />
          <ScoreRing label="Sales" value={briefing.scores.sales} />
          <ScoreRing label="Growth" value={briefing.scores.growth} />
        </div>
      </div>
      {briefing.weeklyPriorities.length > 0 && (
        <AdminPanel title="Priorities" className="mt-6">
          <ul className="space-y-2">
            {briefing.weeklyPriorities.map((p) => (
              <li key={p} className="text-sm text-fog">
                • {p}
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
      {briefing.recommendedActions.slice(0, 3).map((a) => (
        <div key={a.id} className="mt-3">
          <ExecutiveInsightCard
            severity="medium"
            title={a.title}
            detail={a.detail}
            actions={[
              {
                id: a.id,
                label: a.action,
                type: "navigate",
                href: a.href,
              },
            ]}
          />
        </div>
      ))}
    </section>
  );
}
