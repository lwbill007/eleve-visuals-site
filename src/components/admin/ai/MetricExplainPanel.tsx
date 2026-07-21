"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TracedMetric, TruthStatus } from "@/lib/ai/truth/types";
import { TRUTH_STATUS_LABELS } from "@/lib/ai/truth/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<TruthStatus, string> = {
  verified: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  estimated: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  predicted: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  missing: "text-red-400 border-red-500/30 bg-red-500/10",
};

export function MetricExplainPanel({
  metric,
  label,
  onClose,
}: {
  metric: TracedMetric;
  label?: string;
  onClose?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
      onClick={close}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone/25 bg-charcoal p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-explain-title"
      >
        <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">Why am I seeing this?</p>
        <h3 id="metric-explain-title" className="mt-1 font-display text-xl text-cream">
          {label ?? metric.label ?? String(metric.value)}
        </h3>
        <p className="mt-2 font-display text-3xl text-cream">{metric.value}</p>

        <span className={cn("mt-3 inline-block rounded-full border px-2 py-0.5 text-[0.55rem] uppercase", STATUS_STYLES[metric.status])}>
          {TRUTH_STATUS_LABELS[metric.status]} · {Math.round(metric.confidence * 100)}% confidence
        </span>

        <dl className="mt-4 space-y-3 text-xs">
          <div>
            <dt className="text-muted uppercase">Source</dt>
            <dd className="text-fog">{metric.source}</dd>
          </div>
          {metric.table && (
            <div>
              <dt className="text-muted uppercase">Database table</dt>
              <dd className="text-fog">{metric.table}</dd>
            </div>
          )}
          {metric.api && (
            <div>
              <dt className="text-muted uppercase">API</dt>
              <dd className="text-fog">{metric.api}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted uppercase">Calculation</dt>
            <dd className="text-fog">{metric.calculation}</dd>
          </div>
          <div>
            <dt className="text-muted uppercase">Last updated</dt>
            <dd className="text-fog">{new Date(metric.lastUpdated).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted uppercase">Refresh frequency</dt>
            <dd className="text-fog">{metric.refreshFrequency}</dd>
          </div>
          {metric.lowConfidenceReason && (
            <div>
              <dt className="text-muted uppercase">Low confidence because</dt>
              <dd className="text-amber-300">{metric.lowConfidenceReason}</dd>
            </div>
          )}
          {metric.evidence && metric.evidence.length > 0 && (
            <div>
              <dt className="text-muted uppercase">Evidence</dt>
              <dd className="text-fog">
                <ul className="mt-1 space-y-0.5">
                  {metric.evidence.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>

        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="mt-5 min-h-11 w-full rounded-lg border border-stone/30 py-2 text-xs text-fog uppercase hover:border-accent"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function ClickableMetric({
  metric,
  label,
  className,
}: {
  metric: TracedMetric;
  label?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className={cn("text-left hover:underline decoration-accent/50 underline-offset-2", className)}
        title="Why am I seeing this?"
      >
        {metric.value}
        <span className={cn("ml-2 text-[0.55rem] uppercase", STATUS_STYLES[metric.status])}>
          {TRUTH_STATUS_LABELS[metric.status]}
        </span>
      </button>
      {show && <MetricExplainPanel metric={metric} label={label} onClose={() => setShow(false)} />}
    </>
  );
}
