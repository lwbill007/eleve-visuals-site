"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import {
  sortWebsiteRecommendations,
  type WebsiteIntelligenceEngine,
  type WebsiteRecSort,
  type WebsiteRecommendation,
  type WebsiteTruthKind,
} from "@/lib/ai/intelligence/website-engine";
import { cn } from "@/lib/utils";

function truthTone(kind: WebsiteTruthKind) {
  if (kind === "Measured Data") return "border-emerald-400/40 text-emerald-300";
  if (kind === "AI Analysis") return "border-accent/40 text-accent";
  if (kind === "Industry Best Practice") return "border-stone/40 text-fog";
  if (kind === "Verified External Research") return "border-sky-400/40 text-sky-300";
  return "border-amber-400/40 text-amber-200";
}

function priorityTone(p: string) {
  if (p === "critical") return "border-red-400/50 text-red-300 bg-red-400/10";
  if (p === "high") return "border-amber-400/45 text-amber-200 bg-amber-400/10";
  if (p === "medium") return "border-accent/40 text-accent bg-accent/10";
  return "border-stone/40 text-muted";
}

export function WebsiteIntelligenceClient() {
  useSetAIPage("analytics");
  const [data, setData] = useState<WebsiteIntelligenceEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<WebsiteRecSort>("roi");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/ai/website-intelligence${refresh ? "?refresh=1" : ""}`
      );
      if (res.ok) setData((await res.json()) as WebsiteIntelligenceEngine);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recs = useMemo(
    () => (data ? sortWebsiteRecommendations(data.recommendations, sort) : []),
    [data, sort]
  );

  return (
    <WorkspaceChrome
      eyebrow="Command Center · Website"
      title="Website Intelligence Engine"
      description="What: evidence-graded website health. Why: prioritize by business value without fabricating rankings or Lighthouse scores. Next: act on measured gaps first."
      extra={<AskAIButton />}
      related={[
        { label: "Analytics", href: "/admin/analytics", desc: "Measured traffic" },
        { label: "Memory", href: "/admin/memory", desc: "Run SEO scan" },
        { label: "Portfolio", href: "/admin/portfolio", desc: "Projects" },
        { label: "Homepage", href: "/admin/homepage", desc: "Hero & CTA" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-fog">
          Facts and recommendations are labeled. Missing connectors stay{" "}
          <span className="text-cream">Not measured</span> — never invented.
        </p>
        <button
          type="button"
          onClick={() => void load(true)}
          className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
        >
          {loading ? "Refreshing…" : "Refresh · Run Orchestrator"}
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">Loading website intelligence…</p>
      ) : !data ? (
        <p className="text-sm text-red-300">Could not load website intelligence.</p>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary */}
          <section className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 via-charcoal/40 to-charcoal/20 p-5 md:p-6">
            <p className="label-caps text-accent">Executive Summary</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cream-dim">
              {data.executiveSummary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["Overall", data.confidence.overall],
                  ["SEO", data.confidence.seo],
                  ["UX", data.confidence.ux],
                  ["Conversion", data.confidence.conversion],
                  ["Performance", data.confidence.performance],
                  ["Accessibility", data.confidence.accessibility],
                  ["Brand", data.confidence.brand],
                  ["Content", data.confidence.content],
                ] as const
              ).map(([label, value]) => (
                <span
                  key={label}
                  className="border border-stone/30 px-2.5 py-1 text-[0.6rem] tracking-[0.08em] text-fog uppercase"
                >
                  {label} {value}%
                </span>
              ))}
            </div>
          </section>

          {/* Data sources */}
          <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4 md:p-5">
            <p className="mb-3 text-[0.55rem] tracking-[0.14em] text-accent uppercase">
              Data Sources
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.dataSources.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "border px-3 py-2.5 text-sm",
                    s.present
                      ? "border-emerald-400/30 text-cream-dim"
                      : "border-stone/25 text-muted"
                  )}
                >
                  <p className="text-[0.65rem] tracking-[0.08em] uppercase">
                    {s.present ? "✓" : "○"} {s.label}
                  </p>
                  <p className="mt-1 text-xs">{s.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Category health */}
          <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4 md:p-5">
            <p className="mb-3 text-[0.55rem] tracking-[0.14em] text-accent uppercase">
              Website Health by Category
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {data.categories.map((c) => (
                <div key={c.id} className="border border-stone/20 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">
                      {c.label}
                    </p>
                    <span className={cn("text-[0.55rem] uppercase", priorityTone(c.priority))}>
                      {c.priority}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-2xl text-cream">{c.scoreLabel}</p>
                  <p className={cn("mt-1 text-[0.55rem] uppercase", truthTone(c.truthKind))}>
                    {c.truthKind}
                  </p>
                  <p className="mt-2 text-[0.7rem] leading-snug text-fog">{c.summary}</p>
                  <p className="mt-2 text-[0.55rem] text-muted uppercase">
                    Conf {c.confidence}% · Trend {c.trend}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Priority queue */}
          <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">
                  Executive Priority Queue
                </p>
                <p className="mt-1 text-sm text-fog">
                  {data.progress.openCount} open · {data.progress.note}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["roi", "Highest ROI"],
                    ["business", "Business Impact"],
                    ["fast", "Fastest Win"],
                    ["effort", "Lowest Effort"],
                    ["confidence", "Highest Confidence"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSort(id)}
                    className={cn(
                      "border px-2.5 py-1 text-[0.6rem] tracking-[0.08em] uppercase",
                      sort === id
                        ? "border-accent/50 text-accent"
                        : "border-stone/30 text-muted hover:text-fog"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {recs.map((r) => (
                <RecommendationCard
                  key={r.id}
                  rec={r}
                  open={openId === r.id}
                  onToggle={() => setOpenId((id) => (id === r.id ? null : r.id))}
                />
              ))}
            </div>
          </section>

          {/* Heat snapshot */}
          {(data.heat.topConverters.length > 0 || data.heat.weakCtas.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4">
                <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">
                  Top Converters · Measured
                </p>
                <ul className="mt-3 space-y-2 text-sm text-cream-dim">
                  {data.heat.topConverters.map((p) => (
                    <li key={p.path} className="flex justify-between gap-2 border-b border-stone/15 pb-2">
                      <span>{p.path}</span>
                      <span className="text-fog">
                        {p.views} views · {p.conversionRate}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4">
                <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">
                  Weak CTAs · Measured
                </p>
                <ul className="mt-3 space-y-2 text-sm text-cream-dim">
                  {data.heat.weakCtas.length === 0 && (
                    <li className="text-muted">No high-traffic low-conversion paths detected.</li>
                  )}
                  {data.heat.weakCtas.map((w) => (
                    <li key={w.path} className="border-b border-stone/15 pb-2">
                      <span className="text-cream">{w.path}</span>
                      <p className="text-xs text-fog">{w.issue}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      )}
    </WorkspaceChrome>
  );
}

function RecommendationCard({
  rec,
  open,
  onToggle,
}: {
  rec: WebsiteRecommendation;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-stone/25 bg-black/20">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={cn("border px-2 py-0.5 text-[0.55rem] uppercase", priorityTone(rec.priority))}>
              {rec.priority}
            </span>
            <span className={cn("border px-2 py-0.5 text-[0.55rem] uppercase", truthTone(rec.truthKind))}>
              {rec.truthKind}
            </span>
            <span className="border border-stone/30 px-2 py-0.5 text-[0.55rem] text-muted uppercase">
              {rec.confidence}% conf · ROI {rec.roiScore}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg text-cream">{rec.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-fog">{rec.reasoning}</p>
        </div>
        <span className="shrink-0 text-[0.65rem] tracking-[0.1em] text-muted uppercase">
          {open ? "Hide" : "Expand"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-stone/20 px-4 py-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <Block title="Evidence">
              <ul className="space-y-1.5">
                {rec.evidence.map((e, i) => (
                  <li key={i} className="text-cream-dim">
                    <span className={cn("text-[0.55rem] uppercase", truthTone(e.kind))}>
                      {e.kind}
                    </span>
                    <p className="text-xs">{e.text}</p>
                  </li>
                ))}
              </ul>
            </Block>
            <Block title="Explainability">
              <p className="text-xs text-fog">
                <span className="text-muted uppercase">Why am I seeing this?</span>
                <br />
                {rec.whySeeingThis}
              </p>
              <p className="mt-2 text-xs text-fog">
                <span className="text-muted uppercase">If ignored?</span>
                <br />
                {rec.ifIgnored}
              </p>
              <p className="mt-2 text-xs text-cream-dim">
                <span className="text-muted uppercase">Next</span>
                <br />
                {rec.nextStep}
              </p>
            </Block>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Business Impact" value={`${rec.businessImpact}`} />
            <Stat label="UX Impact" value={`${rec.uxImpact}`} />
            <Stat label="SEO Impact" value={`${rec.seoImpact}`} />
            <Stat
              label="Effort"
              value={`${rec.implementationDifficulty} · ~${rec.estimatedMinutes}m`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Block title="Expected Benefits">
              <ul className="list-disc space-y-1 pl-4 text-xs text-cream-dim">
                {rec.expectedBenefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Block>
            <Block title="Potential Risks">
              <ul className="list-disc space-y-1 pl-4 text-xs text-cream-dim">
                {rec.potentialRisks.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Block>
            <Block title="Success Metrics">
              <ul className="list-disc space-y-1 pl-4 text-xs text-cream-dim">
                {rec.successMetrics.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Block>
          </div>

          <div className="flex flex-wrap gap-2">
            {rec.actions.map((a) =>
              a.href ? (
                <Link
                  key={a.id}
                  href={a.href}
                  className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/10"
                >
                  {a.label}
                  {a.requiresApproval ? " · approval" : ""}
                </Link>
              ) : (
                <span
                  key={a.id}
                  className="border border-stone/30 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-muted uppercase"
                >
                  {a.label}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone/20 px-3 py-2">
      <p className="text-[0.5rem] tracking-[0.1em] text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-sm text-cream">{value}</p>
    </div>
  );
}
