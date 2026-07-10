"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { IntelligenceCard } from "@/components/admin/ai/IntelligenceCard";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

const ACK_KEY = "eleve-risk-ack";

export default function RisksPage() {
  useSetAIPage("risks");
  const { context, loading, error, refresh } = useExecutiveContext();
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

  const acknowledge = useCallback(
    (id: string) => {
      const next = { ...acked, [id]: Date.now() };
      localStorage.setItem(ACK_KEY, JSON.stringify(next));
      setAcked(next);
    },
    [acked]
  );

  const risks = (context?.risks ?? []).filter((r) => !ready || !acked[r.id]);

  return (
    <AdminShell title="Risks">
      <WorkspaceChrome
        eyebrow="Command · Attention"
        title="What needs attention"
        description="Derived from Truth Layer, verification, and connectors — not invented alerts. Every risk shows cost of ignore and confidence."
        onRefresh={() => refresh()}
        refreshing={loading}
        related={[
          { label: "Opportunities", href: "/admin/opportunities", desc: "Execute" },
          { label: "Leaks", href: "/admin/leaks", desc: "Lost $" },
          { label: "Missing Intel", href: "/admin/qa", desc: "Connectors" },
          { label: "Workboard", href: "/admin/workboard", desc: "Act" },
        ]}
      >
        {loading && !context ? (
          <WorkspaceLoading />
        ) : error && !context ? (
          <WorkspaceError message={error} onRetry={() => refresh()} />
        ) : risks.length === 0 ? (
          <WorkspaceEmpty
            title="Clear"
            detail="No elevated risks right now — or you acknowledged the current set. New signals appear when truth metrics change."
            actionHref="/admin/leaks"
            actionLabel="Check revenue leaks"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {risks.map((risk) => (
              <IntelligenceCard
                key={risk.id}
                onDone={refresh}
                model={{
                  id: risk.id,
                  title: risk.title,
                  why: risk.detail,
                  evidence: risk.evidence,
                  estimatedRevenue: risk.potentialImpact,
                  confidence: risk.confidence,
                  costOfIgnore: risk.costOfIgnore,
                  expectedOutcome: risk.expectedOutcome,
                  evidenceCount: risk.evidence.length,
                  reasoning: risk.reasoning,
                  prediction: risk.prediction,
                  severity: risk.severity,
                  accent: "risk",
                  secondaryAction: (
                    <button
                      type="button"
                      onClick={() => acknowledge(risk.id)}
                      className="rounded-lg border border-stone/25 px-3 py-1.5 text-[0.65rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream"
                    >
                      Acknowledge
                    </button>
                  ),
                  execute: {
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
                    evidence: risk.evidence,
                    confidence: risk.confidence,
                    expectedRevenue: risk.potentialImpact,
                    expectedOutcome: risk.expectedOutcome,
                  },
                }}
              />
            ))}
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
