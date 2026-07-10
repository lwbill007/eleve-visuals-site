"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { IntelligenceCard } from "@/components/admin/ai/IntelligenceCard";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";

export default function OpportunitiesPage() {
  useSetAIPage("opportunities");
  const { context, loading, error, refresh } = useExecutiveContext();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"impact" | "confidence">("impact");

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

  return (
    <AdminShell title="Opportunities">
      <WorkspaceChrome
        eyebrow="Command · Execute"
        title="What to do next"
        description="Every opportunity answers: if you act, if you don’t, how sure we are, and what evidence supports it. Execute records a Decision automatically."
        onRefresh={() => refresh()}
        refreshing={loading}
        related={[
          { label: "Risks", href: "/admin/risks", desc: "Attention" },
          { label: "Leaks", href: "/admin/leaks", desc: "Lost $" },
          { label: "Workboard", href: "/admin/workboard", desc: "Execute ops" },
          { label: "Business Brain", href: "/admin/memory", desc: "Context" },
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
                    evidenceCount: r.evidence.length,
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
