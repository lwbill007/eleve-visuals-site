"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { IntelligenceCard } from "@/components/admin/ai/IntelligenceCard";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
import { adminFetch } from "@/lib/admin-fetch";
import {
  canTransitionOpportunity,
  type OpportunityStatus,
} from "@/lib/admin-operations";

export default function OpportunitiesPage() {
  useSetAIPage("opportunities");
  const { toast } = useAdminToast();
  const { context, loading, error, refresh } = useExecutiveContext();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"impact" | "confidence">("impact");
  const [busyId, setBusyId] = useState<string | null>(null);

  const recs = useMemo(() => {
    let list = context?.recommendations ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(needle) ||
          r.why.toLowerCase().includes(needle) ||
          r.category.toLowerCase().includes(needle)
      );
    }
    return [...list].sort((a, b) =>
      sort === "confidence"
        ? b.confidence - a.confidence
        : b.estimatedRevenue - a.estimatedRevenue
    );
  }, [context?.recommendations, q, sort]);

  const total = recs.reduce((s, r) => s + r.estimatedRevenue, 0);

  async function recordOutcome(
    recommendationId: string,
    title: string,
    status: "accepted" | "completed" | "rejected"
  ) {
    setBusyId(recommendationId);
    try {
      const res = await adminFetch("/api/admin/ai/opportunities/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          title,
          status,
          result:
            status === "completed"
              ? "Marked complete — verify success metric in owned Analytics/Bookings data"
              : status === "accepted"
                ? "Accepted into execution queue"
                : "Rejected — will not execute",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not record opportunity outcome.");
      }
      toast(
        status === "accepted"
          ? "Opportunity accepted — outcome learning started."
          : status === "completed"
            ? "Opportunity completed — recorded for Business Brain learning."
            : "Opportunity rejected."
      );
      refresh();
    } catch (outcomeError) {
      toast(
        outcomeError instanceof Error
          ? outcomeError.message
          : "Could not record opportunity outcome.",
        "error"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell title="Opportunities">
      <WorkspaceChrome
        eyebrow="Command · How do we grow?"
        title="Opportunities"
        description="Every opportunity includes problem, evidence, impact, confidence, time, difficulty, owner, status, and outcome tracking. Nothing without evidence."
        onRefresh={() => refresh()}
        refreshing={loading}
        related={[
          { label: "Risks", href: "/admin/risks", desc: "Attention" },
          { label: "Leaks", href: "/admin/leaks", desc: "Lost $" },
          { label: "Workboard", href: "/admin/workboard", desc: "Execute ops" },
          { label: "Business Brain", href: "/admin/memory", desc: "Learning" },
        ]}
      >
        <WorkspaceToolbar
          search={q}
          onSearch={setQ}
          searchPlaceholder="Search opportunities…"
        >
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "impact" | "confidence")}
            className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2.5 text-sm text-cream"
            aria-label="Sort"
          >
            <option value="impact">Sort by $ impact</option>
            <option value="confidence">Sort by confidence</option>
          </select>
        </WorkspaceToolbar>

        {loading && !context ? (
          <WorkspaceLoading />
        ) : error && !context ? (
          <WorkspaceError message={error} onRetry={() => refresh()} />
        ) : recs.length === 0 ? (
          <WorkspaceEmpty
            title="No ranked opportunities"
            detail="Nothing actionable right now — or items were deprioritized by sales-recovery guardrails."
            actionHref="/admin/pipeline"
            actionLabel="Open pipeline"
          />
        ) : (
          <div className="space-y-6">
            <OpportunityRevenueBanner total={total} count={recs.length} />
            <div className="grid gap-4 lg:grid-cols-2">
              {recs.map((r) => (
                <IntelligenceCard
                  key={r.id}
                  onDone={refresh}
                  model={{
                    id: r.id,
                    title: r.title,
                    why: r.why,
                    evidence: r.evidence,
                    estimatedRevenue: r.estimatedRevenue,
                    confidence: r.confidence,
                    costOfIgnore: r.costOfIgnore,
                    expectedOutcome: r.expectedOutcome,
                    actualOutcome: r.actualOutcome,
                    actualRevenue: r.actualRevenue,
                    decisionStatus: r.decisionStatus,
                    learningStatus: r.learningStatus,
                    evidenceCount: (r.evidence ?? []).length,
                    reasoning: r.reasoning,
                    prediction: r.prediction,
                    priority: r.priority,
                    category: r.category,
                    timeMinutes: r.timeMinutes,
                    accent: "opportunity",
                    execute: {
                      id: r.id,
                      title: r.title,
                      href: r.href,
                      actionLabel: r.actionLabel,
                      kind: r.executeKind,
                      evidence: r.evidence,
                      confidence: r.confidence,
                      expectedRevenue: r.estimatedRevenue,
                      expectedOutcome: r.expectedOutcome,
                    },
                    secondaryAction: (
                      <div className="flex flex-wrap gap-2">
                        {canTransitionOpportunity(
                          (r.decisionStatus ?? "pending") as OpportunityStatus,
                          "accepted"
                        ) ? (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void recordOutcome(r.id, r.title, "accepted")}
                            className="rounded-lg border border-accent/40 px-2.5 py-1.5 text-[0.58rem] tracking-wider text-accent uppercase disabled:opacity-50"
                          >
                            Accept
                          </button>
                        ) : null}
                        {canTransitionOpportunity(
                          (r.decisionStatus ?? "pending") as OpportunityStatus,
                          "completed"
                        ) ? (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void recordOutcome(r.id, r.title, "completed")}
                            className="rounded-lg border border-emerald-400/40 px-2.5 py-1.5 text-[0.58rem] tracking-wider text-emerald-300 uppercase disabled:opacity-50"
                          >
                            Complete + learn
                          </button>
                        ) : null}
                        {canTransitionOpportunity(
                          (r.decisionStatus ?? "pending") as OpportunityStatus,
                          "rejected"
                        ) ? (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void recordOutcome(r.id, r.title, "rejected")}
                            className="rounded-lg border border-stone/30 px-2.5 py-1.5 text-[0.58rem] tracking-wider text-muted uppercase disabled:opacity-50"
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    ),
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link href="/admin/briefing" className="text-accent hover:underline">
                AI Briefing →
              </Link>
              <Link href="/admin/memory" className="text-accent hover:underline">
                Business Brain · Decisions & Learnings →
              </Link>
            </div>
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
