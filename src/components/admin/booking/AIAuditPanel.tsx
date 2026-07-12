"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { EVIDENCE_SOURCE_LABELS, type EvidenceSourceType } from "@/lib/ai/evidence/schema";
import type { OrchestratorAuditLog } from "@/lib/ai/orchestrator";
import { cn } from "@/lib/utils";

export function AIAuditPanel({
  submissionId,
  data,
  email,
}: {
  submissionId: string;
  data: Record<string, unknown>;
  email?: string;
}) {
  const [audit, setAudit] = useState<OrchestratorAuditLog | null>(null);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/ai/orchestrator?submissionId=${encodeURIComponent(submissionId)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { audit: OrchestratorAuditLog | null };
        setAudit(json.audit);
      }
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/ai/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKind: "booking_review",
          submissionId,
          data,
          email,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { audit: OrchestratorAuditLog };
        setAudit(json.audit);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-stone/25 bg-charcoal/25">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="label-caps text-[0.55rem] text-muted">Observable AI</p>
          <h3 className="font-display text-lg text-cream">AI Activity · Audit</h3>
        </div>
        <button
          type="button"
          onClick={() => void runNow()}
          className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
        >
          {loading ? "Running…" : audit ? "Re-run" : "Run Orchestrator"}
        </button>
      </div>

      {!audit ? (
        <div className="border-t border-stone/20 px-4 py-4 text-sm text-fog">
          No orchestrator audit yet. Run after inquiry submit, or trigger now.
        </div>
      ) : (
        <div className="space-y-4 border-t border-stone/20 px-4 py-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["Overall", audit.confidence.overall],
                ["Creative", audit.confidence.creative],
                ["Business", audit.confidence.business],
                ["Research", audit.confidence.research],
                ["Production", audit.confidence.production],
                ["Sales", audit.confidence.sales],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border border-stone/20 bg-black/20 px-2 py-2">
                <p className="text-[0.5rem] tracking-[0.1em] text-muted uppercase">{label}</p>
                <p className="font-display text-xl text-cream">{value}%</p>
              </div>
            ))}
          </div>

          <ul className="space-y-1">
            {audit.agents.map((a) => (
              <li key={a.agentId} className="border border-stone/15">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/[0.02]"
                  onClick={() =>
                    setOpenAgent((id) => (id === a.agentId ? null : a.agentId))
                  }
                >
                  <span className="text-cream">{a.title}</span>
                  <span className="text-[0.65rem] tracking-[0.1em] text-emerald-300/90 uppercase">
                    {a.status}
                    {typeof a.confidence === "number" ? ` · ${a.confidence}%` : ""}
                  </span>
                </button>
                {openAgent === a.agentId && (
                  <div className="border-t border-stone/15 px-3 py-2 text-xs text-cream-dim">
                    <p>{a.summary}</p>
                    <p className="mt-2 text-fog">{a.reasoning}</p>
                    {a.toolsAttempted.length > 0 && (
                      <p className="mt-2 text-muted">
                        Tools: {a.toolsAttempted.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div>
            <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Evidence</p>
            <ul className="mt-1 space-y-1 text-sm text-cream-dim">
              {audit.evidence.items.map((e) => (
                <li key={e.id}>
                  {e.status === "verified" ? "✓" : e.status === "missing" ? "✗" : "~"}{" "}
                  {e.label}: {e.value}
                  <span className="text-muted">
                    {" "}
                    · {EVIDENCE_SOURCE_LABELS[e.sourceType as EvidenceSourceType]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">
              Recommended Actions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {audit.actions.map((action) =>
                action.href ? (
                  <Link
                    key={action.id}
                    href={action.href}
                    className={cn(
                      "border px-3 py-1.5 text-[0.65rem] tracking-[0.1em] uppercase",
                      action.priority === "high"
                        ? "border-accent/40 text-accent"
                        : "border-stone/40 text-fog"
                    )}
                  >
                    {action.label}
                    {action.requiresApproval ? " · approval" : ""}
                  </Link>
                ) : (
                  <span key={action.id} className="text-xs text-muted">
                    {action.label}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
