"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { IntelligenceCard } from "@/components/admin/ai/IntelligenceCard";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { adminFetch } from "@/lib/admin-fetch";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

export default function RisksPage() {
  useSetAIPage("risks");
  const { toast } = useAdminToast();
  const { context, loading, error, refresh } = useExecutiveContext();
  const [acked, setAcked] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void adminFetch("/api/admin/risks/acknowledgements")
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | { acknowledgements?: Record<string, string>; error?: string }
          | null;
        if (!response.ok) throw new Error(body?.error || "Could not load acknowledgements.");
        if (!cancelled) setAcked(body?.acknowledgements ?? {});
      })
      .catch(() => {
        if (!cancelled) toast("Risk acknowledgements could not be loaded.", "error");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const acknowledge = useCallback(
    async (id: string) => {
      setAckBusyId(id);
      try {
        const response = await adminFetch("/api/admin/risks/acknowledgements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ riskId: id }),
        });
        const body = (await response.json().catch(() => null)) as
          | { acknowledgedAt?: string; error?: string }
          | null;
        if (!response.ok || !body?.acknowledgedAt) {
          throw new Error(body?.error || "Could not save acknowledgement.");
        }
        setAcked((current) => ({ ...current, [id]: body.acknowledgedAt! }));
        toast("Risk acknowledged for the shared admin workspace.");
      } catch (ackError) {
        toast(
          ackError instanceof Error ? ackError.message : "Could not save acknowledgement.",
          "error"
        );
      } finally {
        setAckBusyId(null);
      }
    },
    [toast]
  );

  const risks = (context?.risks ?? []).filter((r) => !ready || !acked[r.id]);

  return (
    <AdminShell title="Risks">
      <WorkspaceChrome
        eyebrow="Command · What could hurt us?"
        title="Risks"
        description="Severity, likelihood, evidence, impact, owner, deadline, recovery plan, and verification. Domains: Website, Bookings, Cash Flow, Portfolio, SEO, AI, Payments."
        onRefresh={() => refresh()}
        refreshing={loading}
        related={[
          { label: "Opportunities", href: "/admin/opportunities", desc: "Execute" },
          { label: "Leaks", href: "/admin/leaks", desc: "Lost $" },
          { label: "Missing Intel", href: "/admin/qa", desc: "Connectors" },
          { label: "Workboard", href: "/admin/workboard", desc: "Act" },
        ]}
      >
        <p className="mb-4 text-xs text-muted">
          Acknowledgements are persisted server-side for the shared admin workspace; individual
          admin attribution is not available in the current auth model.
        </p>
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
                  why: [
                    risk.detail,
                    risk.domain ? `Domain · ${risk.domain}` : null,
                    risk.owner ? `Owner · ${risk.owner}` : null,
                    typeof risk.likelihood === "number"
                      ? `Likelihood · ${Math.round(risk.likelihood * 100)}%`
                      : null,
                    risk.deadline
                      ? `Deadline · ${new Date(risk.deadline).toLocaleDateString()}`
                      : null,
                    risk.recoveryPlan ? `Recovery · ${risk.recoveryPlan}` : null,
                    risk.verification ? `Verification · ${risk.verification}` : null,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  evidence: risk.evidence,
                  estimatedRevenue: risk.potentialImpact,
                  confidence: risk.confidence,
                  costOfIgnore: risk.costOfIgnore,
                  expectedOutcome: risk.expectedOutcome,
                  evidenceCount: (risk.evidence ?? []).length,
                  reasoning: risk.reasoning,
                  prediction: risk.prediction,
                  severity: risk.severity,
                  accent: "risk",
                  secondaryAction: (
                    <button
                      type="button"
                      disabled={!ready || ackBusyId === risk.id}
                      onClick={() => void acknowledge(risk.id)}
                      className="rounded-lg border border-stone/25 px-3 py-1.5 text-[0.65rem] tracking-[0.08em] text-fog uppercase hover:border-stone/40 hover:text-cream disabled:opacity-50"
                    >
                      {ackBusyId === risk.id ? "Saving…" : "Acknowledge"}
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
