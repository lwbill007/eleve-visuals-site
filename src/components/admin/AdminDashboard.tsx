"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { OwnedMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import {
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import type { CommandHomePayload } from "@/lib/ai/platform/command-home";
import { cn } from "@/lib/utils";

const RELATED = [
  { label: "AI Briefing", href: "/admin/briefing", desc: "Why it happened" },
  { label: "Opportunities", href: "/admin/opportunities", desc: "How we grow" },
  { label: "Risks", href: "/admin/risks", desc: "What could hurt us" },
  { label: "Revenue Leaks", href: "/admin/leaks", desc: "Where money is lost" },
];

function SignalCard({
  eyebrow,
  title,
  evidence,
  href,
  tone,
}: {
  eyebrow: string;
  title: string;
  evidence: string[];
  href: string;
  tone: "win" | "problem" | "opportunity" | "risk";
}) {
  const toneClass =
    tone === "win"
      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
      : tone === "problem" || tone === "risk"
        ? "border-red-400/30 bg-red-400/[0.05]"
        : "border-accent/30 bg-accent/[0.05]";
  return (
    <Link
      href={href}
      className={cn("rounded-xl border p-4 transition-colors hover:border-accent/40", toneClass)}
    >
      <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">{eyebrow}</p>
      <p className="mt-2 text-sm leading-snug text-cream">{title}</p>
      <ul className="mt-2 space-y-0.5">
        {evidence.slice(0, 2).map((item) => (
          <li key={item} className="text-[0.65rem] text-fog">
            {item}
          </li>
        ))}
      </ul>
    </Link>
  );
}

export function AdminDashboard() {
  useSetAIPage("dashboard");
  const [data, setData] = useState<CommandHomePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback((force = false) => {
    setLoading(true);
    setError("");
    adminFetch(`/api/admin/os/dashboard${force ? "?refresh=1" : ""}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json() as Promise<CommandHomePayload>;
      })
      .then((payload) => {
        setData(payload);
        setError("");
      })
      .catch(() => {
        setError("Could not load Command Home.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <WorkspaceChrome
      eyebrow="Command · What happened?"
      title="Executive Dashboard"
      description="Single source of truth. Every KPI has one owner. Missing numbers explain how to unlock them."
      onRefresh={() => load(true)}
      refreshing={loading}
      related={RELATED}
    >
      {loading && !data ? (
        <WorkspaceLoading />
      ) : error && !data ? (
        <WorkspaceError message={error} onRetry={() => load(true)} />
      ) : data ? (
        <div className="space-y-8">
          <section>
            <p className="text-[0.58rem] tracking-[0.16em] text-accent uppercase">
              Executive summary
            </p>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-cream">
              {data.executiveSummary.briefing}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.executiveSummary.biggestWin && (
                <SignalCard
                  eyebrow="Biggest win"
                  title={data.executiveSummary.biggestWin.title}
                  evidence={data.executiveSummary.biggestWin.evidence}
                  href={data.executiveSummary.biggestWin.href}
                  tone="win"
                />
              )}
              {data.executiveSummary.biggestProblem && (
                <SignalCard
                  eyebrow="Biggest problem"
                  title={data.executiveSummary.biggestProblem.title}
                  evidence={data.executiveSummary.biggestProblem.evidence}
                  href={data.executiveSummary.biggestProblem.href}
                  tone="problem"
                />
              )}
              {data.executiveSummary.biggestOpportunity && (
                <SignalCard
                  eyebrow="Biggest opportunity"
                  title={data.executiveSummary.biggestOpportunity.title}
                  evidence={data.executiveSummary.biggestOpportunity.evidence}
                  href={data.executiveSummary.biggestOpportunity.href}
                  tone="opportunity"
                />
              )}
              {data.executiveSummary.biggestRisk && (
                <SignalCard
                  eyebrow="Biggest risk"
                  title={data.executiveSummary.biggestRisk.title}
                  evidence={data.executiveSummary.biggestRisk.evidence}
                  href={data.executiveSummary.biggestRisk.href}
                  tone="risk"
                />
              )}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                  Today’s KPIs
                </p>
                <h3 className="mt-1 font-display text-2xl text-cream">Owned metrics only</h3>
              </div>
              <p className="text-xs text-muted">No duplicate calculations</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.kpis.map((kpi) => (
                <OwnedMetricCard
                  key={kpi.key}
                  owned={kpi}
                  currency={kpi.key.includes("revenue") || kpi.key.includes("pipeline") || kpi.key.includes("cash")}
                />
              ))}
            </div>
          </section>

          <section>
            <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
              Business health
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <p className="font-display text-5xl text-cream">
                {data.businessHealth.overall == null
                  ? "—"
                  : Math.round(data.businessHealth.overall)}
              </p>
              <p className="max-w-xl text-sm text-fog">{data.businessHealth.disclaimer}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {data.businessHealth.domains.map((domain) => (
                <Link
                  key={domain.id}
                  href={domain.href}
                  className="rounded-xl border border-stone/20 bg-charcoal/20 p-3 transition-colors hover:border-accent/35"
                >
                  <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                    {domain.label}
                  </p>
                  <p className="mt-2 font-display text-2xl text-cream">
                    {domain.score == null ? "—" : Math.round(domain.score)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.62rem] text-fog">{domain.explain}</p>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
              What’s changed
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.whatChanged.map((change) => (
                <Link
                  key={change.id}
                  href={change.ownerHref}
                  className="rounded-xl border border-stone/20 bg-charcoal/15 p-4 transition-colors hover:border-accent/35"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-cream">{change.label}</p>
                    <span
                      className={cn(
                        "text-xs",
                        change.direction === "up"
                          ? "text-emerald-300"
                          : change.direction === "down"
                            ? "text-red-300"
                            : "text-muted"
                      )}
                    >
                      {change.deltaLabel} · {change.period.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fog">{change.why}</p>
                  <ul className="mt-2 space-y-0.5">
                    {change.evidence.map((item) => (
                      <li key={item} className="text-[0.65rem] text-muted">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                  Today’s priorities
                </p>
                <h3 className="mt-1 font-display text-2xl text-cream">
                  Max five · ranked by impact
                </h3>
              </div>
              <Link href="/admin/opportunities" className="text-xs text-accent">
                All opportunities →
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {data.priorities.length === 0 ? (
                <p className="rounded-xl border border-stone/20 px-4 py-6 text-sm text-muted">
                  No ranked priorities yet. Opportunities appear when measured signals create
                  evidence-backed recommendations.
                </p>
              ) : (
                data.priorities.map((priority, index) => (
                  <article
                    key={priority.id}
                    className="rounded-xl border border-stone/20 bg-charcoal/15 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                          #{index + 1} · {priority.category} · {priority.owner}
                        </p>
                        <h4 className="mt-1 text-base text-cream">{priority.recommendation}</h4>
                        <p className="mt-1 text-sm text-fog">{priority.problem}</p>
                        <p className="mt-2 text-xs text-muted">
                          Impact · {priority.businessImpact}
                          {priority.estimatedRevenueImpact > 0
                            ? ` · Est. $${priority.estimatedRevenueImpact.toLocaleString()} (Predicted)`
                            : " · $ impact unknown"}
                          {" · "}
                          {priority.timeRequiredMinutes}m · Confidence{" "}
                          {Math.round(priority.confidence * 100)}%
                        </p>
                        <ul className="mt-2 space-y-0.5">
                          {priority.evidence.slice(0, 3).map((item) => (
                            <li key={item} className="text-[0.65rem] text-fog">
                              Evidence · {item}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[0.65rem] text-muted">
                          Success · {priority.successMetric}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {priority.actions.slice(0, 2).map((action) => (
                          <ExecuteButton
                            key={action.id}
                            target={{
                              id: `${priority.id}-${action.id}`,
                              title: action.label,
                              href: action.href,
                              evidence: priority.evidence,
                              confidence: priority.confidence,
                              expectedRevenue: priority.estimatedRevenueImpact,
                              expectedOutcome: priority.successMetric,
                            }}
                            className="rounded-lg bg-cream px-3 py-2 text-[0.65rem] tracking-wider text-ink uppercase"
                          />
                        ))}
                        <Link
                          href="/admin/opportunities"
                          className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase"
                        >
                          Track outcome
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </WorkspaceChrome>
  );
}
