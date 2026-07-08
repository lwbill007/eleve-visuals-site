"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
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
        eyebrow="Command"
        title="What needs attention"
        description="Derived from Truth Layer, verification, and connectors — not invented alerts. Execute when a real fix exists."
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
                <ExecuteButton
                  target={{
                    id: risk.id,
                    title: risk.title,
                    href: risk.href,
                    actionLabel: risk.actionLabel,
                    kind:
                      risk.id === "risk-stale-inquiries"
                        ? "mark_stale_bookings_contacted"
                        : risk.id === "risk-unverified-memory"
                          ? "open_memory_verify"
                          : risk.id.startsWith("risk-connector") || risk.id === "risk-zero-revenue"
                            ? "open_payments_trust"
                            : undefined,
                  }}
                  onDone={refresh}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
