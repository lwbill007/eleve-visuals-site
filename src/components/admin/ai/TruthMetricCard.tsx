"use client";

import Link from "next/link";
import { useState } from "react";
import type { TruthValue } from "@/lib/ai/platform/truth-metadata";
import { TRUTH_LABELS } from "@/lib/ai/platform/truth-metadata";
import { MetricExplainPanel } from "@/components/admin/ai/MetricExplainPanel";
import type { TracedMetric, TruthStatus } from "@/lib/ai/truth/types";
import { cn } from "@/lib/utils";

const LABEL_STYLES: Record<string, string> = {
  verified: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  calculated: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  estimated: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  predicted: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  unknown: "text-red-400 border-red-500/30 bg-red-500/10",
};

function toTracedMetric(metric: TruthValue<number | string>): TracedMetric {
  const status: TruthStatus =
    metric.label === "unknown"
      ? "missing"
      : metric.label === "calculated"
        ? "estimated"
        : metric.label;
  return {
    value: metric.value,
    status,
    label: metric.displayLabel,
    source: metric.source,
    table: metric.table,
    api: metric.api,
    lastUpdated: metric.timestamp,
    confidence: metric.confidence,
    calculation: metric.calculation,
    refreshFrequency: metric.freshness,
    lowConfidenceReason: metric.missingReason,
    evidence: metric.evidence,
  };
}

function formatValue(v: number | string, currency = false): string {
  if (typeof v === "string") return v;
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  if (currency) {
    if (v >= 1000) return `$${Math.round(v / 100) / 10}k`;
    return v > 0 ? `$${v.toLocaleString()}` : "—";
  }
  return v.toLocaleString();
}

export function TruthMetricCard({
  metric,
  hint,
  delta,
  href,
  currency = false,
  className,
}: {
  metric: TruthValue<number | string>;
  hint?: string;
  delta?: number | null;
  href?: string;
  currency?: boolean;
  className?: string;
}) {
  const [showExplain, setShowExplain] = useState(false);
  const label = metric.displayLabel ?? "Metric";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] tracking-[0.16em] text-muted uppercase">{label}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
            LABEL_STYLES[metric.label] ?? LABEL_STYLES.estimated
          )}
        >
          {TRUTH_LABELS[metric.label]}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setShowExplain(true);
        }}
        className="mt-2 text-left font-display text-3xl text-cream sm:text-4xl hover:underline decoration-accent/40 underline-offset-4"
        title="Why am I seeing this?"
      >
        {formatValue(metric.value, currency)}
      </button>
      {(hint || metric.missingReason) && (
        <p className="mt-1 text-xs text-fog">{hint ?? metric.missingReason}</p>
      )}
      {delta != null && (
        <p className={cn("mt-2 text-xs", delta >= 0 ? "text-emerald-400/90" : "text-red-400/90")}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs last month
        </p>
      )}
      {showExplain && (
        <MetricExplainPanel metric={toTracedMetric(metric)} label={label} onClose={() => setShowExplain(false)} />
      )}
    </>
  );

  const classes = cn(
    "rounded-xl border border-stone/25 bg-charcoal/20 p-5 transition-all duration-300 hover:border-accent/35 hover:bg-charcoal/40",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}
