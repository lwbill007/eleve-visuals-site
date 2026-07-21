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
import type { CommandHomePayload } from "@/lib/ai/platform/command-home-types";
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
  evidence?: string[] | null;
  href: string;
  tone: "win" | "problem" | "opportunity" | "risk";
}) {
  const toneClass =
    tone === "win"
      ? "border-emerald-400/50"
      : tone === "problem" || tone === "risk"
        ? "border-red-400/50"
        : "border-accent/50";
  const evidenceItems = evidence ?? [];
  return (
    <Link
      href={href}
      className={cn(
        "group border-l bg-charcoal/10 px-4 py-3 transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-charcoal/35",
        toneClass
      )}
    >
      <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">{eyebrow}</p>
      <p className="mt-2 text-sm leading-snug text-cream transition-colors group-hover:text-accent">
        {title}
      </p>
      <ul className="mt-2 space-y-0.5">
        {evidenceItems.slice(0, 2).map((item) => (
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

  const generatedLabel = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <WorkspaceChrome
      eyebrow="Command home"
      title="Today at ÉLEVÉ"
      description="Measured business signals, ranked decisions, and the next work that moves the studio forward."
      onRefresh={() => load(true)}
      refreshing={loading}
      extra={
        generatedLabel ? (
          <span className="text-[0.6rem] tracking-[0.08em] text-muted uppercase">
            Updated {generatedLabel}
          </span>
        ) : null
      }
      related={RELATED}
      showAI={false}
    >
      {loading && !data ? (
        <WorkspaceLoading />
      ) : error && !data ? (
        <WorkspaceError message={error} onRetry={() => load(true)} />
      ) : data ? (
        <div className="space-y-10">
          <section aria-labelledby="executive-summary-heading">
            <div className="grid gap-5 border-t border-stone/30 pt-4 lg:grid-cols-12">
              <p
                id="executive-summary-heading"
                className="text-[0.58rem] tracking-[0.16em] text-accent uppercase lg:col-span-2"
              >
                Executive read
              </p>
              <p className="max-w-4xl text-base leading-relaxed text-cream lg:col-span-10 lg:text-lg">
                {data.executiveSummary?.briefing ?? "Executive summary unavailable."}
              </p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.executiveSummary?.biggestWin ? (
                <SignalCard
                  eyebrow="Win"
                  title={data.executiveSummary.biggestWin.title}
                  evidence={data.executiveSummary.biggestWin.evidence}
                  href={data.executiveSummary.biggestWin.href}
                  tone="win"
                />
              ) : null}
              {data.executiveSummary?.biggestProblem ? (
                <SignalCard
                  eyebrow="Problem"
                  title={data.executiveSummary.biggestProblem.title}
                  evidence={data.executiveSummary.biggestProblem.evidence}
                  href={data.executiveSummary.biggestProblem.href}
                  tone="problem"
                />
              ) : null}
              {data.executiveSummary?.biggestOpportunity ? (
                <SignalCard
                  eyebrow="Opportunity"
                  title={data.executiveSummary.biggestOpportunity.title}
                  evidence={data.executiveSummary.biggestOpportunity.evidence}
                  href={data.executiveSummary.biggestOpportunity.href}
                  tone="opportunity"
                />
              ) : null}
              {data.executiveSummary?.biggestRisk ? (
                <SignalCard
                  eyebrow="Risk"
                  title={data.executiveSummary.biggestRisk.title}
                  evidence={data.executiveSummary.biggestRisk.evidence}
                  href={data.executiveSummary.biggestRisk.href}
                  tone="risk"
                />
              ) : null}
            </div>
          </section>

          <section aria-labelledby="owned-metrics-heading">
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone/30 pt-4">
              <div>
                <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                  Business snapshot
                </p>
                <h3 id="owned-metrics-heading" className="mt-1 font-display text-2xl text-cream">
                  Owned metrics
                </h3>
              </div>
              <p className="text-xs text-muted">One source per metric · unknown stays unknown</p>
            </div>
            {(data.kpis ?? []).length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(data.kpis ?? []).map((kpi) => (
                  <OwnedMetricCard
                    key={kpi.key}
                    owned={kpi}
                    currency={
                      kpi.key.includes("revenue") ||
                      kpi.key.includes("pipeline") ||
                      kpi.key.includes("cash")
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 border border-stone/20 px-4 py-6 text-sm text-muted">
                No owned metrics are available yet.
              </p>
            )}
          </section>

          <section aria-labelledby="priority-heading">
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone/30 pt-4">
              <div>
                <p className="text-[0.58rem] tracking-[0.16em] text-accent uppercase">
                  Decision runway
                </p>
                <h3 id="priority-heading" className="mt-1 font-display text-2xl text-cream">
                  What needs action today
                </h3>
              </div>
              <Link
                href="/admin/opportunities"
                className="inline-flex min-h-11 items-center text-xs text-accent hover:text-cream"
              >
                All opportunities →
              </Link>
            </div>
            <div className="mt-4">
              {(data.priorities ?? []).length === 0 ? (
                <p className="border border-stone/20 px-4 py-8 text-sm text-muted">
                  No ranked priorities yet. They appear when measured signals create an
                  evidence-backed recommendation.
                </p>
              ) : (
                (data.priorities ?? []).map((priority, index) => (
                  <article
                    key={priority.id}
                    className="grid gap-4 border-t border-stone/25 py-5 first:border-t-0 sm:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <p className="font-display text-3xl text-stone/70" aria-label={`Priority ${index + 1}`}>
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 max-w-3xl flex-1">
                        <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                          {priority.category} · {priority.owner}
                        </p>
                        <h4 className="mt-1 text-base leading-snug text-cream">
                          {priority.recommendation}
                        </h4>
                        <p className="mt-1 text-sm text-fog">{priority.problem}</p>
                        <p className="mt-3 text-xs leading-relaxed text-muted">
                          Impact · {priority.businessImpact}
                          {priority.estimatedRevenueImpact > 0
                            ? ` · Est. $${priority.estimatedRevenueImpact.toLocaleString()} (predicted)`
                            : " · Revenue impact unknown"}
                          {" · "}
                          {priority.timeRequiredMinutes}m · Confidence{" "}
                          {Math.round(priority.confidence * 100)}%
                        </p>
                        {(priority.evidence ?? []).length > 0 ? (
                          <ul className="mt-2 space-y-0.5">
                            {(priority.evidence ?? []).slice(0, 3).map((item) => (
                              <li key={item} className="text-[0.65rem] text-fog">
                                Evidence · {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-2 text-[0.65rem] text-muted">
                          Success · {priority.successMetric}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(priority.actions ?? []).slice(0, 2).map((action) => (
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
                          className="inline-flex min-h-9 items-center rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase hover:border-accent/40 hover:text-accent"
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

          <div className="grid gap-8 xl:grid-cols-12">
            <section className="xl:col-span-5" aria-labelledby="business-health-heading">
              <div className="border-t border-stone/30 pt-4">
                <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                  Business health
                </p>
                <div className="mt-3 flex items-end gap-4">
                  <p id="business-health-heading" className="font-display text-6xl text-cream">
                    {data.businessHealth?.overall == null
                      ? "—"
                      : Math.round(data.businessHealth.overall)}
                  </p>
                  <p className="pb-2 text-sm text-fog">{data.businessHealth?.disclaimer}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px bg-stone/20">
                {(data.businessHealth?.domains ?? []).map((domain) => (
                  <Link
                    key={domain.id}
                    href={domain.href}
                    className="group bg-ink p-3 transition-colors duration-500 hover:bg-charcoal/35"
                  >
                    <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                      {domain.label}
                    </p>
                    <p className="mt-2 font-display text-2xl text-cream group-hover:text-accent">
                      {domain.score == null ? "—" : Math.round(domain.score)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[0.62rem] text-fog">{domain.explain}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="xl:col-span-7" aria-labelledby="changes-heading">
              <div className="border-t border-stone/30 pt-4">
                <p className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                  Movement
                </p>
                <h3 id="changes-heading" className="mt-1 font-display text-2xl text-cream">
                  What changed
                </h3>
              </div>
              {(data.whatChanged ?? []).length > 0 ? (
                <div className="mt-4 divide-y divide-stone/20">
                  {(data.whatChanged ?? []).map((change) => (
                    <Link
                      key={change.id}
                      href={change.ownerHref}
                      className="group block py-4 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-cream group-hover:text-accent">{change.label}</p>
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
                          {change.deltaLabel} · {(change.period ?? "unknown").replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-fog">{change.why}</p>
                      {(change.evidence ?? []).length > 0 ? (
                        <p className="mt-2 line-clamp-2 text-[0.65rem] text-muted">
                          {(change.evidence ?? []).join(" · ")}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 border border-stone/20 px-4 py-8 text-sm text-muted">
                  No measured changes are available for the current comparison periods.
                </p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </WorkspaceChrome>
  );
}
