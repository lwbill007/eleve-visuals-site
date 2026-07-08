"use client";

import Link from "next/link";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { cn } from "@/lib/utils";

function trustColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 55) return "text-amber-300";
  return "text-red-400";
}

/**
 * Thin, platform-wide status strip. Renders the same trust signals on every
 * admin page: data-trust score, knowledge verification %, and connector health.
 * Renders nothing until context resolves (no fabricated placeholder).
 */
export function ExecutiveContextBar() {
  const { context, loading } = useExecutiveContext();

  if (loading && !context) {
    return (
      <div className="border-b border-stone/10 bg-ink/60 px-4 py-1.5 sm:px-6 lg:px-8">
        <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Loading executive context…</p>
      </div>
    );
  }

  if (!context) return null;

  const { trustScore, verification, connectors, health } = context;
  const connectorLabel =
    connectors.disconnected > 0
      ? `${connectors.healthy}/${connectors.total} connected`
      : `${connectors.healthy}/${connectors.total} healthy`;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-stone/10 bg-ink/60 px-4 py-1.5 text-[0.65rem] sm:px-6 lg:px-8">
      {health && (
        <span className="flex items-center gap-1.5" title={health.overall.note}>
          <span className="tracking-[0.14em] text-muted uppercase">Health</span>
          <span className={cn("font-medium", trustColor(health.overall.score))}>
            {health.overall.score}/100
          </span>
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="tracking-[0.14em] text-muted uppercase">Trust</span>
        <span className={cn("font-medium", trustColor(trustScore))}>{trustScore}/100</span>
      </span>
      <Link href="/admin/memory" className="flex items-center gap-1.5 hover:underline">
        <span className="tracking-[0.14em] text-muted uppercase">Verified</span>
        <span className={cn("font-medium", trustColor(verification.verifiedPct))}>
          {verification.verifiedPct}%
        </span>
        <span className="text-muted">({verification.pending} pending)</span>
      </Link>
      <span className="flex items-center gap-1.5">
        <span className="tracking-[0.14em] text-muted uppercase">Sources</span>
        <span className={cn("font-medium", connectors.disconnected > 0 ? "text-amber-300" : "text-emerald-400")}>
          {connectorLabel}
        </span>
      </span>
      {connectors.degradedLabels.length > 0 && (
        <span className="truncate text-amber-300/70" title={connectors.degradedLabels.join(", ")}>
          Degraded: {connectors.degradedLabels.slice(0, 2).join(", ")}
          {connectors.degradedLabels.length > 2 ? ` +${connectors.degradedLabels.length - 2}` : ""}
        </span>
      )}
    </div>
  );
}
