"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";

const SNOOZE_KEY = "eleve-next-action-snooze";
const DONE_KEY = "eleve-next-action-done";

function readMap(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, number>) {
  localStorage.setItem(key, JSON.stringify(value));
}

function trustColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 55) return "text-amber-300";
  return "text-red-400";
}

/** Single COO chrome: health + trust + next action with snooze/done/execute. */
export function COOBar() {
  const { context, loading, error, refresh } = useExecutiveContext();
  const { toast } = useAdminToast();
  const [hiddenUntil, setHiddenUntil] = useState<Record<string, number>>({});
  const [doneIds, setDoneIds] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHiddenUntil(readMap(SNOOZE_KEY));
    setDoneIds(readMap(DONE_KEY));
    setReady(true);
  }, []);

  const snooze = useCallback((id: string, hours: number) => {
    const next = { ...readMap(SNOOZE_KEY), [id]: Date.now() + hours * 3600_000 };
    writeMap(SNOOZE_KEY, next);
    setHiddenUntil(next);
  }, []);

  const markDone = useCallback(
    async (id: string, title: string) => {
      const next = { ...readMap(DONE_KEY), [id]: Date.now() };
      writeMap(DONE_KEY, next);
      setDoneIds(next);
      try {
        await adminFetch("/api/admin/ai/mission/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            missionId: id,
            title,
            worked: true,
            notes: "Marked done from COO bar",
          }),
        });
      } catch {
        /* non-blocking */
      }
      toast("Marked done.");
      refresh();
    },
    [refresh, toast]
  );

  if (loading && !context) {
    return (
      <div className="border-b border-stone/10 bg-ink/70 px-4 py-2 sm:px-6 lg:px-8">
        <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Loading COO…</p>
      </div>
    );
  }

  if (!context) {
    if (!error) return null;
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 bg-amber-500/5 px-4 py-2 sm:px-6 lg:px-8"
      >
        <p className="text-[0.7rem] text-amber-200">COO context unavailable — {error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-lg border border-stone/30 px-2.5 py-1 text-[0.6rem] tracking-[0.1em] text-fog uppercase hover:border-accent hover:text-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  const { trustScore, verification, connectors, health, nextAction, headline } = context;
  const now = Date.now();
  const action =
    ready &&
    nextAction &&
    !doneIds[nextAction.id] &&
    !(hiddenUntil[nextAction.id] && hiddenUntil[nextAction.id] > now)
      ? nextAction
      : null;

  return (
    <div className="border-b border-stone/15 bg-ink/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[0.65rem] sm:px-6 lg:px-8">
        {health && (
          <span className="flex items-center gap-1.5" title={health.overall.note}>
            <span className="tracking-[0.12em] text-muted uppercase">Health</span>
            <span className={cn("font-medium", trustColor(health.overall.score))}>{health.overall.score}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="tracking-[0.12em] text-muted uppercase">Trust</span>
          <span className={cn("font-medium", trustColor(trustScore))}>{trustScore}</span>
        </span>
        <Link href="/admin/memory" className="flex items-center gap-1.5 hover:underline">
          <span className="tracking-[0.12em] text-muted uppercase">Brain</span>
          <span className={cn("font-medium", trustColor(verification.verifiedPct))}>
            {verification.verifiedPct}%
          </span>
        </Link>
        <Link href="/admin/qa" className="flex items-center gap-1.5 hover:underline">
          <span className="tracking-[0.12em] text-muted uppercase">Sources</span>
          <span
            className={cn(
              "font-medium",
              connectors.disconnected > 0 ? "text-amber-300" : "text-emerald-400"
            )}
          >
            {connectors.healthy}/{connectors.total}
          </span>
        </Link>
        {!action && headline && (
          <span className="hidden min-w-0 truncate text-fog lg:inline" title={headline}>
            {headline}
          </span>
        )}
      </div>

      {action && (
        <div className="border-t border-accent/15 bg-accent/[0.05] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.55rem] tracking-[0.18em] text-accent uppercase">Do next</span>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
                    action.priority === "critical"
                      ? "border-red-500/40 text-red-400"
                      : action.priority === "high"
                        ? "border-amber-500/40 text-amber-300"
                        : "border-stone/30 text-muted"
                  )}
                >
                  {action.priority}
                </span>
              </div>
              <p className="mt-1 truncate font-display text-base text-cream sm:text-lg">{action.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-fog">{action.why}</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[0.65rem] text-muted">
                <span>
                  {action.estimatedRevenue > 0
                    ? `~$${action.estimatedRevenue.toLocaleString()} impact`
                    : "Impact TBD"}
                </span>
                <span>{Math.round(action.confidence * 100)}% confidence</span>
                <span>~{action.timeMinutes} min</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => snooze(action.id, 24)}
                className="rounded-lg border border-stone/25 px-3 py-2 text-[0.6rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream"
              >
                Snooze 1d
              </button>
              <button
                type="button"
                onClick={() => markDone(action.id, action.title)}
                className="rounded-lg border border-stone/25 px-3 py-2 text-[0.6rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream"
              >
                Done
              </button>
              <Link
                href="/admin/opportunities"
                className="rounded-lg border border-stone/25 px-3 py-2 text-[0.6rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream"
              >
                Queue
              </Link>
              <ExecuteButton
                target={{
                  id: action.id,
                  title: action.title,
                  href: action.href,
                  actionLabel: action.actionLabel,
                  kind: action.executeKind,
                }}
                onDone={refresh}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
