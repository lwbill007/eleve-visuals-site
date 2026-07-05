"use client";

import Link from "next/link";
import type { SynthesizedExecutiveBriefing } from "@/lib/ai/executive/synthesizer";
import { cn } from "@/lib/utils";
import { BusinessActionBar } from "./BusinessActionBar";

const urgencyStyles = {
  critical: "border-red-500/35 bg-red-500/8",
  high: "border-amber-500/30 bg-amber-500/6",
  medium: "border-stone/25 bg-charcoal/10",
  low: "border-stone/20 bg-charcoal/5",
};

export function ExecutiveSynthesisPanel({ synthesis }: { synthesis: SynthesizedExecutiveBriefing }) {
  return (
    <section className="os-glass space-y-6 rounded-2xl border border-accent/25 p-6">
      <div>
        <p className="label-caps text-accent">Collective intelligence</p>
        <h3 className="mt-2 font-display text-2xl text-cream">{synthesis.headline}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fog">{synthesis.narrative}</p>
        <p className="mt-3 text-xs text-muted">{synthesis.businessHealthSummary}</p>
      </div>

      {synthesis.moneyOnTable > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
          <p className="text-[0.6rem] uppercase text-emerald-400">Estimated opportunity</p>
          <p className="font-display text-3xl text-cream">~${synthesis.moneyOnTable.toLocaleString()}</p>
          <p className="text-xs text-fog">Weighted by confidence across ranked opportunities</p>
        </div>
      )}

      <div>
        <p className="mb-3 text-[0.65rem] tracking-[0.14em] text-muted uppercase">Top priorities</p>
        <div className="space-y-3">
          {synthesis.topPriorities.slice(0, 5).map((p) => (
            <div key={p.id} className={cn("rounded-xl border p-4", urgencyStyles[p.urgency])}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-cream">{p.title}</p>
                <span className="text-[0.6rem] uppercase text-muted">
                  {Math.round(p.confidence * 100)}% conf · {p.effort} effort
                </span>
              </div>
              <p className="mt-1 text-xs text-fog">{p.why}</p>
              <p className="mt-2 text-xs text-muted">
                {p.supportingRoles.map((r) => r.toUpperCase()).join(" · ")}
                {p.expectedRevenue > 0 && ` · ~$${p.expectedRevenue.toLocaleString()} upside`}
              </p>
              <BusinessActionBar
                className="mt-3"
                compact
                actions={p.actions.map((a, i) => ({
                  id: `${p.id}-action-${i}`,
                  label: a.label,
                  type: "navigate" as const,
                  href: a.href,
                }))}
              />
            </div>
          ))}
        </div>
      </div>

      {synthesis.disagreements.length > 0 && (
        <div className="rounded-xl border border-stone/20 p-4">
          <p className="text-[0.6rem] uppercase text-amber-300">Director tension</p>
          {synthesis.disagreements.map((d) => (
            <div key={d.topic} className="mt-2">
              <p className="text-sm text-cream">{d.topic}</p>
              <ul className="mt-1 space-y-1 text-xs text-fog">
                {d.positions.map((pos) => (
                  <li key={pos}>· {pos}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/admin/opportunities" className="text-accent hover:underline">
          All opportunities →
        </Link>
        <Link href="/admin/marketing" className="text-fog hover:text-cream">
          Content calendar →
        </Link>
        <Link href="/admin/memory" className="text-fog hover:text-cream">
          Knowledge engine →
        </Link>
      </div>
    </section>
  );
}
