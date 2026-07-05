"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExecutiveOS, ExecutiveRoleBrief } from "@/lib/ai/executive/types";
import { cn } from "@/lib/utils";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  DecisionCard,
  ExecutionDraftCard,
  ExecutiveScoreGrid,
  ForecastCard,
  OpportunityCard,
  RiskCard,
  TransparencyPanel,
} from "@/components/admin/os/ExecutiveIntelligenceComponents";

const KIND_COLORS: Record<string, string> = {
  fact: "text-emerald-400",
  prediction: "text-blue-300",
  suggestion: "text-accent",
  inference: "text-amber-300",
  unknown: "text-muted",
};

function HealthPill({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "text-emerald-400" : value >= 50 ? "text-amber-300" : "text-red-400";
  return (
    <div className="os-panel rounded-xl p-3 text-center">
      <p className={cn("font-display text-2xl", color)}>{value}</p>
      <p className="mt-1 text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
    </div>
  );
}

function RoleCard({ role }: { role: ExecutiveRoleBrief }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-stone/20 bg-charcoal/10 transition-colors hover:border-accent/25">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">{role.title}</p>
            <p className="mt-1 text-sm font-medium text-cream">{role.topPriority}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-cream">{role.healthScore}</p>
            <p className="text-[0.55rem] text-muted">health</p>
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t border-stone/15 px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-fog">{role.mission}</p>
          <ul className="space-y-1 text-xs text-fog">
            {role.insights.map((i) => (
              <li key={i.text}>
                <span className={cn("text-[0.6rem] uppercase", KIND_COLORS[i.kind])}>{i.kind}</span> · {i.text}
              </li>
            ))}
          </ul>
          {role.recommendations[0] && (
            <div className="rounded-lg border border-accent/15 bg-accent/5 p-3">
              <p className="text-sm text-cream">{role.recommendations[0].title}</p>
              <p className="mt-1 text-xs text-fog">{role.recommendations[0].why}</p>
              <BusinessActionBar actions={role.recommendations[0].actions} compact className="mt-2" />
            </div>
          )}
          <Link href={role.href} className="text-xs text-accent hover:underline">
            Open {role.id.toUpperCase()} hub →
          </Link>
        </div>
      )}
    </div>
  );
}

export function ExecutiveCommandCenter({ os }: { os: ExecutiveOS }) {
  const cc = os.commandCenter;

  return (
    <div className="space-y-8">
      <section className="os-glass rounded-2xl border border-accent/30 p-6">
        <p className="label-caps text-accent">Executive Intelligence System</p>
        <p className="mt-2 max-w-3xl text-sm text-fog">{cc.morningBriefing}</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
          <HealthPill label="Business" value={cc.businessHealth} />
          <HealthPill label="Marketing" value={cc.marketingHealth} />
          <HealthPill label="Sales" value={cc.salesHealth} />
          <HealthPill label="Revenue" value={cc.revenueHealth} />
          <HealthPill label="Website" value={cc.websiteHealth} />
          <HealthPill label="SEO" value={cc.seoHealth} />
          <HealthPill label="Brand" value={cc.brandHealth} />
          <HealthPill label="Clients" value={cc.clientHealth} />
          <HealthPill label="Operations" value={cc.operationsHealth} />
        </div>
      </section>

      {cc.urgentAlerts.length > 0 && (
        <AdminPanel title="Urgent alerts" subtitle="Requires attention today">
          <ul className="space-y-2">
            {cc.urgentAlerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className={cn(
                    "block rounded-lg border p-3 transition-colors hover:border-accent/40",
                    a.severity === "high" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/25 bg-amber-500/5"
                  )}
                >
                  <p className="text-sm text-cream">{a.title}</p>
                  <p className="text-xs text-fog">{a.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {cc.highestRoiTask && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <p className="text-[0.6rem] uppercase text-emerald-400">Highest ROI task today</p>
            <p className="mt-2 text-lg font-medium text-cream">{cc.highestRoiTask.title}</p>
            <p className="mt-1 text-sm text-fog">{cc.highestRoiTask.why}</p>
            <p className="mt-2 text-xs text-muted">
              ~${cc.highestRoiTask.revenueImpact.toLocaleString()} impact · {Math.round(cc.highestRoiTask.confidence * 100)}% confidence
            </p>
            <Link href={cc.highestRoiTask.href} className="mt-3 inline-block text-xs text-accent hover:underline">
              Take action →
            </Link>
          </div>
        )}
        {cc.highestPriorityTask && (
          <div className="rounded-xl border border-accent/25 bg-accent/5 p-5">
            <p className="text-[0.6rem] uppercase text-accent">Highest priority</p>
            <p className="mt-2 text-lg font-medium text-cream">{cc.highestPriorityTask.title}</p>
            <Link href={cc.highestPriorityTask.href} className="mt-3 inline-block text-xs text-accent hover:underline">
              Go →
            </Link>
          </div>
        )}
      </div>

      <AdminPanel title="Executive team" subtitle="Seven interconnected intelligence directors — tap to expand">
        <div className="grid gap-3 lg:grid-cols-2">
          {os.roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Knowledge graph" subtitle={`${os.knowledgeGraph.nodes} nodes · ${os.knowledgeGraph.edges} connections`}>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(os.knowledgeGraph.layers).map(([layer, count]) => (
            <span key={layer} className="rounded-full border border-stone/25 px-2.5 py-1 text-muted">
              {layer}: {count}
            </span>
          ))}
        </div>
        {os.knowledgeGraph.recentLinks.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-fog">
            {os.knowledgeGraph.recentLinks.map((l) => (
              <li key={l}>→ {l}</li>
            ))}
          </ul>
        )}
        <Link href="/admin/memory" className="mt-3 inline-block text-xs text-accent hover:underline">
          Knowledge Engine & graph →
        </Link>
      </AdminPanel>

      <section>
        <h3 className="mb-4 font-display text-xl text-cream">Business health scores</h3>
        <ExecutiveScoreGrid scores={cc.scores} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Top opportunity" subtitle="Evidence-backed">
          {cc.topOpportunity ? <OpportunityCard opp={cc.topOpportunity} /> : <p className="text-sm text-fog">No opportunities flagged.</p>}
        </AdminPanel>
        <AdminPanel title="Top risk" subtitle="Act before it compounds">
          {cc.topRisk ? <RiskCard risk={cc.topRisk} /> : <p className="text-sm text-fog">No elevated risks.</p>}
        </AdminPanel>
      </div>

      <AdminPanel title="Predictions" subtitle="Confidence-scored forecasts">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {os.predictions.map((f) => (
            <ForecastCard key={f.metric} forecast={f} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Automation queue" subtitle="Drafts ready — nothing publishes without your approval">
        <div className="space-y-3">
          {os.automationQueue.map((d) => (
            <ExecutionDraftCard key={d.id} draft={d} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Self-improvement" subtitle="What ÉLEVÉ AI learned from outcomes">
        {os.selfImprovement.length === 0 ? (
          <p className="text-sm text-muted">Lessons accumulate as recommendations are acted on and outcomes recorded.</p>
        ) : (
          <ul className="space-y-2">
            {os.selfImprovement.map((l) => (
              <li key={l.id} className="rounded-lg border border-stone/15 p-3 text-xs">
                <p className="text-cream">{l.lesson}</p>
                <p className="mt-1 text-muted">
                  {l.domain} · confidence {l.confidenceChange} · {new Date(l.recordedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="Decisions" subtitle="Always explains why">
        <div className="grid gap-3 lg:grid-cols-2">
          {os.intelligence.decisions.slice(0, 4).map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      </AdminPanel>

      <TransparencyPanel
        dataSources={os.transparency.dataSources}
        assumptions={os.transparency.suggestions}
        unknowns={os.transparency.unknowns}
      />
    </div>
  );
}
