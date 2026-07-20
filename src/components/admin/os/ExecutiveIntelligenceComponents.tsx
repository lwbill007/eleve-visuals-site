"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  BusinessTimelineEvent,
  ExecutiveDecision,
  ExecutiveForecast,
  ExecutiveOpportunity,
  ExecutiveRisk,
  ExecutiveScore,
  ExecutionDraft,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";

function formatCurrency(n: number) {
  if (n >= 1000) return `$${Math.round(n / 100) / 10}k`;
  return n > 0 ? `$${n.toLocaleString()}` : "—";
}

function trendIcon(trend: ExecutiveScore["trend"]) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

export function ExecutiveScoreGrid({ scores }: { scores: ExecutiveScore[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {scores.map((score) => {
        const isOpen = expanded === score.key;
        return (
          <button
            key={score.key}
            type="button"
            onClick={() => setExpanded(isOpen ? null : score.key)}
            className={cn(
              "os-panel rounded-xl border p-4 text-left transition-all",
              isOpen ? "border-accent/40 bg-charcoal/30" : "border-stone/20 hover:border-accent/25"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">{score.label}</p>
              <span
                className={cn(
                  "text-xs",
                  score.trend === "up" ? "text-emerald-400" : score.trend === "down" ? "text-red-400" : "text-muted"
                )}
              >
                {trendIcon(score.trend)} {score.change >= 0 ? "+" : ""}
                {score.change}
              </span>
            </div>
            <p className="mt-2 font-display text-4xl text-cream">{score.value}</p>
            {isOpen ? (
              <div className="mt-3 space-y-2 border-t border-stone/15 pt-3">
                <p className="text-xs leading-relaxed text-fog">
                  <span className="text-accent">Why:</span> {score.why}
                </p>
                <ul className="space-y-1 text-[0.65rem] text-muted">
                  {(score.evidence ?? []).map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
                <p className="text-[0.6rem] text-muted">
                  Confidence {Math.round(score.confidence * 100)}% · {score.dataSources.join(", ")}
                </p>
              </div>
            ) : (
              <p className="mt-2 line-clamp-2 text-[0.65rem] text-muted">Tap for explanation</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function OpportunityRevenueBanner({ total, count }: { total: number; count: number }) {
  return (
    <section className="os-glass rounded-2xl border border-emerald-500/20 p-5 sm:p-6">
      <p className="label-caps text-emerald-400">Potential revenue</p>
      <p className="mt-1 font-display text-4xl text-cream">{formatCurrency(total)}</p>
      <p className="mt-2 text-sm text-fog">
        {count} ranked opportunities identified from live pipeline, CRM, and analytics data.
      </p>
      <Link href="/admin/opportunities" className="mt-4 inline-block text-xs text-accent hover:underline">
        Open Opportunity Center →
      </Link>
    </section>
  );
}

export function OpportunityCard({ opp }: { opp: ExecutiveOpportunity }) {
  return (
    <article className="os-panel rounded-xl border border-stone/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
            {opp.category} · {opp.urgency} urgency
          </p>
          <h4 className="mt-1 text-sm font-medium text-cream">{opp.title}</h4>
        </div>
        <span className="rounded-full border border-emerald-500/25 px-2.5 py-1 text-xs text-emerald-300">
          {formatCurrency(opp.expectedRevenue)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-fog">{opp.detail}</p>
      <p className="mt-2 text-xs text-cream-dim">
        <span className="text-accent">Why:</span> {opp.why}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] text-muted">
        <span>Confidence {Math.round(opp.confidence * 100)}%</span>
        <span>Effort: {opp.effort}</span>
        <span>~{opp.estimatedMinutes}m</span>
      </div>
      <BusinessActionBar actions={opp.actions} compact className="mt-3" />
    </article>
  );
}

export function RiskCard({ risk }: { risk: ExecutiveRisk }) {
  const border =
    risk.severity === "critical"
      ? "border-red-500/30"
      : risk.severity === "high"
        ? "border-amber-500/25"
        : "border-stone/20";

  return (
    <article className={cn("os-panel rounded-xl border p-4", border)}>
      <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
        {risk.category} · {risk.severity}
      </p>
      <h4 className="mt-1 text-sm font-medium text-cream">{risk.title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-fog">{risk.detail}</p>
      <p className="mt-2 text-xs text-cream-dim">
        <span className="text-accent">Why flagged:</span> {risk.why}
      </p>
      {risk.potentialImpact > 0 && (
        <p className="mt-2 text-xs text-amber-300">Potential impact: {formatCurrency(risk.potentialImpact)}</p>
      )}
      <ul className="mt-2 space-y-0.5 text-[0.65rem] text-muted">
        {(risk.evidence ?? []).map((e) => (
          <li key={e}>• {e}</li>
        ))}
      </ul>
      <BusinessActionBar actions={risk.mitigations} compact className="mt-3" />
    </article>
  );
}

export function DecisionCard({ decision }: { decision: ExecutiveDecision }) {
  return (
    <article className="os-panel rounded-xl border border-accent/15 p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h4 className="text-sm font-medium text-cream">{decision.title}</h4>
        <span className="text-xs text-accent">{Math.round(decision.confidence * 100)}% confidence</span>
      </div>
      <p className="mt-2 text-xs text-fog">{decision.recommendation}</p>
      <p className="mt-2 text-xs">
        <span className="text-accent">Expected:</span> {decision.expectedOutcome}
      </p>
      {decision.historicalComparison && (
        <p className="mt-1 text-[0.65rem] text-muted">{decision.historicalComparison}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] text-muted">
        <span>Risk: {decision.riskLevel}</span>
        <span>ROI: {formatCurrency(decision.estimatedRoi)}</span>
        <span>~{decision.implementationMinutes}m</span>
      </div>
      <BusinessActionBar actions={decision.actions} compact className="mt-3" />
    </article>
  );
}

export function ForecastCard({ forecast }: { forecast: ExecutiveForecast }) {
  return (
    <div className="os-panel rounded-xl border border-stone/20 p-4">
      <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">{forecast.horizon}</p>
      <h4 className="mt-1 text-sm text-cream">{forecast.label}</h4>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl text-cream">
          {forecast.metric === "conversion" ? `${forecast.predicted}%` : forecast.predicted.toLocaleString()}
        </span>
        <span className="text-xs text-muted">
          ({forecast.low.toLocaleString()}–{forecast.high.toLocaleString()})
        </span>
      </div>
      <p className="mt-2 text-xs text-fog">{forecast.why}</p>
      <p className="mt-2 text-[0.65rem] text-muted">Confidence {Math.round(forecast.confidence * 100)}%</p>
    </div>
  );
}

export function TimelineEvent({ event }: { event: BusinessTimelineEvent }) {
  return (
    <div className="relative border-l border-stone/25 pl-4 pb-6 last:pb-0">
      <div className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-accent" />
      <p className="text-[0.6rem] text-muted">{new Date(event.date).toLocaleDateString()}</p>
      <p className="mt-1 text-sm text-cream">{event.title}</p>
      <p className="mt-1 text-xs text-fog">{event.detail}</p>
      <p className="mt-1 text-[0.65rem] text-muted">
        {event.source}
        {event.verified ? " · verified" : " · inferred"}
        {event.impact ? ` · ${event.impact}` : ""}
      </p>
    </div>
  );
}

export function ExecutionDraftCard({ draft }: { draft: ExecutionDraft }) {
  return (
    <Link
      href={draft.href}
      className="os-panel group block rounded-xl border border-stone/20 p-4 transition-colors hover:border-accent/30"
    >
      <div className="flex justify-between gap-2">
        <p className="text-sm text-cream group-hover:text-accent">{draft.title}</p>
        <span
          className={cn(
            "text-[0.6rem] uppercase tracking-wider",
            draft.status === "ready" ? "text-emerald-400" : "text-amber-400"
          )}
        >
          {draft.status === "ready" ? "Ready" : "Review"}
        </span>
      </div>
      <p className="mt-2 text-xs text-fog">{draft.description}</p>
      <p className="mt-2 text-[0.65rem] text-muted">~{draft.estimatedMinutes}m · requires approval to send</p>
    </Link>
  );
}

export function TransparencyPanel({
  dataSources,
  assumptions,
  unknowns,
}: {
  dataSources: string[];
  assumptions: string[];
  unknowns: string[];
}) {
  return (
    <details className="os-panel rounded-xl border border-stone/20 p-4">
      <summary className="cursor-pointer text-sm text-cream">Transparency & data sources</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs text-fog">
        <div>
          <p className="label-caps text-muted mb-2">Sources</p>
          <ul className="space-y-1">{dataSources.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
        <div>
          <p className="label-caps text-muted mb-2">Assumptions</p>
          <ul className="space-y-1">{assumptions.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
        <div>
          <p className="label-caps text-muted mb-2">Unknowns</p>
          <ul className="space-y-1">{unknowns.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
      </div>
    </details>
  );
}
