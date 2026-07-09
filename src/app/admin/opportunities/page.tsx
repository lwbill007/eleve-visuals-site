"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import {
  WorkspaceAIStrip,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLoading,
  WorkspaceRelated,
} from "@/components/admin/os/WorkspaceFrame";
import { cn } from "@/lib/utils";

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
      <WorkspaceHeader
        eyebrow="Command"
        title="What to do next"
        description="Ranked by impact × confidence. Execute runs a real adapter when possible — otherwise opens the right Work screen."
        onRefresh={() => refresh()}
        refreshing={loading}
      />
      <WorkspaceAIStrip />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search opportunities…"
          className="min-w-[12rem] flex-1 border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "impact" | "confidence")}
          className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
          aria-label="Sort"
        >
          <option value="impact">Sort by $ impact</option>
          <option value="confidence">Sort by confidence</option>
        </select>
      </div>

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
              <article key={r.id} className="os-panel rounded-xl border border-stone/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
                        r.priority === "critical"
                          ? "border-red-500/40 text-red-400"
                          : r.priority === "high"
                            ? "border-amber-500/40 text-amber-300"
                            : "border-stone/30 text-muted"
                      )}
                    >
                      {r.priority}
                    </span>
                    <span className="ml-2 text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                      {r.category}
                    </span>
                  </div>
                  <p className="font-display text-xl text-emerald-400">
                    {r.estimatedRevenue > 0 ? `~$${r.estimatedRevenue.toLocaleString()}` : "—"}
                  </p>
                </div>
                <h3 className="mt-3 font-display text-lg text-cream">{r.title}</h3>
                <p className="mt-2 text-sm text-fog">{r.why}</p>
                {r.evidence.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[0.7rem] text-muted">
                    {r.evidence.map((e) => (
                      <li key={e}>• {e}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[0.65rem] text-muted">
                    {Math.round(r.confidence * 100)}% confidence · ~{r.timeMinutes} min
                  </p>
                  <ExecuteButton
                    target={{
                      id: r.id,
                      title: r.title,
                      href: r.href,
                      actionLabel: r.actionLabel,
                      kind: r.executeKind,
                    }}
                    onDone={refresh}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/admin/briefing" className="text-accent hover:underline">
          AI Briefing →
        </Link>
        <Link href="/admin/memory" className="text-accent hover:underline">
          Business Brain →
        </Link>
      </div>

      <WorkspaceRelated
        links={[
          { label: "Risks", href: "/admin/risks", desc: "Attention" },
          { label: "Leaks", href: "/admin/leaks", desc: "Lost $" },
          { label: "Workboard", href: "/admin/workboard", desc: "Execute ops" },
        ]}
      />
    </AdminShell>
  );
}
