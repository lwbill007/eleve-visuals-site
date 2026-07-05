"use client";

import Link from "next/link";
import type { BusinessAction } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";

export function ExecutiveDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Loading command center">
      <div className="rounded-2xl border border-stone/20 bg-charcoal/20 p-8">
        <div className="h-4 w-32 rounded bg-stone/30" />
        <div className="mt-4 h-10 w-2/3 max-w-lg rounded bg-stone/25" />
        <div className="mt-4 h-16 w-full max-w-2xl rounded bg-stone/20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-stone/20 bg-charcoal/15" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-52 rounded-xl border border-stone/20 bg-charcoal/15" />
        <div className="h-52 rounded-xl border border-stone/20 bg-charcoal/15" />
      </div>
    </div>
  );
}

export function HighestRoiBanner({
  title,
  why,
  revenueImpact,
  timeSavedMinutes,
  href,
  actionLabel,
}: {
  title: string;
  why: string;
  revenueImpact: number;
  timeSavedMinutes: number;
  href: string;
  actionLabel: string;
}) {
  return (
    <section className="os-glass relative overflow-hidden rounded-2xl border border-accent/25 p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="label-caps text-accent">Today&apos;s highest ROI action</p>
          <h3 className="mt-2 font-display text-2xl text-cream">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">{why}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            {revenueImpact > 0 && (
              <span className="rounded-full border border-accent/20 px-2.5 py-1 text-accent">
                ~${revenueImpact.toLocaleString()} revenue impact
              </span>
            )}
            {timeSavedMinutes > 0 && (
              <span className="rounded-full border border-stone/25 px-2.5 py-1">
                ~{timeSavedMinutes} min saved vs manual follow-up
              </span>
            )}
          </div>
        </div>
        <a
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cream px-5 py-3 text-xs tracking-[0.12em] text-ink uppercase transition-colors hover:bg-accent"
        >
          {actionLabel} →
        </a>
      </div>
    </section>
  );
}

export function ExecutiveScoreStrip({
  scores,
}: {
  scores: {
    businessHealth: number;
    marketing: number;
    sales: number;
    productivity: number;
    customerSatisfaction: number;
    growth: number;
  };
}) {
  const items = [
    { label: "Business", value: scores.businessHealth },
    { label: "Growth", value: scores.growth },
    { label: "Marketing", value: scores.marketing },
    { label: "Sales", value: scores.sales },
    { label: "Productivity", value: scores.productivity },
    { label: "Clients", value: scores.customerSatisfaction },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="os-panel rounded-xl p-4 text-center">
          <p className="font-display text-3xl text-cream">{item.value}</p>
          <p className="mt-1 text-[0.55rem] tracking-[0.14em] text-muted uppercase">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ExecutiveInsightCard({
  severity,
  category,
  title,
  detail,
  why,
  metric,
  revenueImpact,
  timeSavedMinutes,
  actions,
}: {
  severity: string;
  category?: string;
  title: string;
  detail: string;
  why?: string;
  metric?: string;
  revenueImpact?: number;
  timeSavedMinutes?: number;
  actions?: BusinessAction[];
}) {
  const border =
    severity === "high"
      ? "border-red-500/20 hover:border-red-500/35"
      : severity === "medium"
        ? "border-amber-500/20 hover:border-amber-500/35"
        : "border-stone/20 hover:border-accent/30";

  return (
    <article className={cn("os-panel rounded-xl border p-4 transition-colors", border)}>
      <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
        {category ?? "insight"} · {severity}
        {metric ? ` · ${metric}` : ""}
      </p>
      <h4 className="mt-2 text-sm font-medium text-cream">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-fog">{detail}</p>
      {why && why !== detail && (
        <p className="mt-2 text-xs text-cream-dim">
          <span className="text-accent">Why:</span> {why}
        </p>
      )}
      {(revenueImpact || timeSavedMinutes) && (
        <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] text-muted">
          {revenueImpact ? <span>Est. ${revenueImpact.toLocaleString()}</span> : null}
          {timeSavedMinutes ? <span>~{timeSavedMinutes}m saved</span> : null}
        </div>
      )}
      {actions && actions.length > 0 && <BusinessActionBar actions={actions} compact className="mt-3" />}
    </article>
  );
}

export function ExecutiveQuickLink({
  label,
  desc,
  href,
  metric,
}: {
  label: string;
  desc: string;
  href: string;
  metric?: string;
}) {
  return (
    <Link
      href={href}
      className="group os-panel flex flex-col rounded-xl border p-4 transition-all hover:border-accent/35 hover:bg-charcoal/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-cream group-hover:text-accent">{label}</p>
        {metric && <span className="text-xs text-accent">{metric}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">{desc}</p>
    </Link>
  );
}
