"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { cn } from "@/lib/utils";

const ACK_KEY = "eleve-risk-ack";

const severityStyle = {
  critical: "border-red-500/40 text-red-400",
  high: "border-amber-500/40 text-amber-300",
  medium: "border-stone/30 text-fog",
  low: "border-stone/20 text-muted",
} as const;

export default function RisksPage() {
  useSetAIPage("risks");
  const { context, loading, refresh } = useExecutiveContext();
  const [acked, setAcked] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setAcked(JSON.parse(localStorage.getItem(ACK_KEY) || "{}") as Record<string, number>);
    } catch {
      setAcked({});
    }
    setReady(true);
  }, []);

  const acknowledge = useCallback((id: string) => {
    const next = { ...acked, [id]: Date.now() };
    localStorage.setItem(ACK_KEY, JSON.stringify(next));
    setAcked(next);
  }, [acked]);

  const risks = (context?.risks ?? []).filter((r) => !ready || !acked[r.id]);

  return (
    <AdminShell title="Risks">
      <AdminPageHeader
        eyebrow="Needs attention"
        title="What needs attention"
        description="Derived from Truth Layer metrics, verification health, and connector status — not invented alerts."
        action={
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        }
      />

      {loading && !context ? (
        <p className="text-fog">Loading risks…</p>
      ) : risks.length === 0 ? (
        <AdminPanel title="Clear">
          <p className="text-sm text-fog">
            No elevated risks right now — or you acknowledged the current set. New signals will appear when
            truth metrics change.
          </p>
        </AdminPanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {risks.map((risk) => (
            <article key={risk.id} className="os-panel rounded-xl border border-stone/20 p-5">
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase", severityStyle[risk.severity])}>
                {risk.severity}
              </span>
              <h3 className="mt-3 font-display text-lg text-cream">{risk.title}</h3>
              <p className="mt-2 text-sm text-fog">{risk.detail}</p>
              {risk.evidence.length > 0 && (
                <ul className="mt-3 space-y-1 text-[0.7rem] text-muted">
                  {risk.evidence.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => acknowledge(risk.id)}
                  className="rounded-lg border border-stone/25 px-3 py-1.5 text-[0.65rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream"
                >
                  Acknowledge
                </button>
                <Link
                  href={risk.href}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.08em] text-accent uppercase hover:bg-accent/20"
                >
                  {risk.actionLabel} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
