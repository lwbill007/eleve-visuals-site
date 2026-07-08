"use client";

import Link from "next/link";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { cn } from "@/lib/utils";

/**
 * Platform-wide "What should I do next?" strip.
 * Every admin page inherits the same top guarded recommendation so the OS
 * always answers the core question — never charts alone.
 */
export function NextActionBar() {
  const { context, loading } = useExecutiveContext();

  if (loading && !context) return null;
  if (!context?.nextAction) return null;

  const a = context.nextAction;
  const confPct = Math.round(a.confidence * 100);
  const revenueLabel =
    a.estimatedRevenue > 0 ? `~$${a.estimatedRevenue.toLocaleString()} impact` : "Impact TBD";

  return (
    <div className="border-b border-accent/20 bg-accent/[0.04] px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.55rem] tracking-[0.18em] text-accent uppercase">Do next</span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
                a.priority === "critical"
                  ? "border-red-500/40 text-red-400"
                  : a.priority === "high"
                    ? "border-amber-500/40 text-amber-300"
                    : "border-stone/30 text-muted"
              )}
            >
              {a.priority}
            </span>
            <span className="text-[0.55rem] text-muted uppercase">{a.category}</span>
          </div>
          <p className="mt-1 truncate font-display text-base text-cream sm:text-lg">{a.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-fog">{a.why}</p>
          <div className="mt-1.5 flex flex-wrap gap-3 text-[0.65rem] text-muted">
            <span>{revenueLabel}</span>
            <span>{confPct}% confidence</span>
            <span>~{a.timeMinutes} min</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/opportunities"
            className="rounded-lg border border-stone/25 px-3 py-2 text-[0.65rem] tracking-[0.08em] text-fog uppercase transition-colors hover:border-stone/40 hover:text-cream"
          >
            All opportunities
          </Link>
          <Link
            href={a.href}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-[0.65rem] tracking-[0.1em] text-accent uppercase transition-colors hover:bg-accent/25"
          >
            {a.actionLabel} →
          </Link>
        </div>
      </div>
    </div>
  );
}
