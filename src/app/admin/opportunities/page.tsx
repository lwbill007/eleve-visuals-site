"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import { cn } from "@/lib/utils";

export default function OpportunitiesPage() {
  useSetAIPage("opportunities");
  const { context, loading, refresh } = useExecutiveContext();

  const recs = context?.recommendations ?? [];
  const total = recs.reduce((s, r) => s + r.estimatedRevenue, 0);

  return (
    <AdminShell title="Opportunity Center">
      <AdminPageHeader
        eyebrow="Opportunity Engine"
        title="What to do next"
        description="Ranked by expected business impact × confidence. Same queue as every other page — one brain, not a separate dashboard."
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
        <p className="text-fog">Loading opportunities from Executive Context…</p>
      ) : recs.length === 0 ? (
        <AdminPanel title="No ranked opportunities">
          <p className="text-sm text-fog">
            The recommendation engine has nothing actionable right now — or all items were deprioritized by
            sales-recovery guardrails. Check pipeline and Business Brain.
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            <Link href="/admin/pipeline" className="text-accent hover:underline">
              Pipeline →
            </Link>
            <Link href="/admin/memory" className="text-accent hover:underline">
              Business Brain →
            </Link>
          </div>
        </AdminPanel>
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
                  <Link
                    href={r.href}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.08em] text-accent uppercase hover:bg-accent/20"
                  >
                    {r.actionLabel} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
