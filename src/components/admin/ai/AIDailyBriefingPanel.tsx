"use client";

import Link from "next/link";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { ExecutiveInsightCard } from "@/components/admin/os/ExecutiveOSComponents";

function ScoreRing({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone/30">
        <span className="font-display text-base text-cream">{value}</span>
      </div>
      <p className="mt-1.5 text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
    </div>
  );
}

export function AIDailyBriefingPanel({ compact = false }: { compact?: boolean }) {
  const ctx = useBriefingOptional();
  const briefing = ctx?.briefing;
  const loading = ctx?.loading ?? true;
  const refresh = ctx?.refresh;

  if (loading && !briefing) {
    return (
      <div className="os-glass animate-pulse rounded-2xl border border-accent/20 p-6" aria-busy="true">
        <div className="h-5 w-48 rounded bg-stone/30" />
        <div className="mt-4 h-24 rounded bg-stone/20" />
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <section className="os-glass rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-charcoal/20 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-accent">CEO Briefing</p>
          <h2 className="mt-2 font-display text-xl text-cream">{briefing.ceoHeadline}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cream-dim">{briefing.summary}</p>
          <p className="mt-2 text-xs text-muted">
            Updated {new Date(briefing.generatedAt).toLocaleString()}
            {briefing.provider !== "rules" && ` · ${briefing.provider}`}
          </p>
        </div>
        <div className="flex gap-2">
          {refresh && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-stone/30 px-3 py-2 text-xs text-fog uppercase hover:border-accent"
            >
              Refresh
            </button>
          )}
          <Link
            href="/admin"
            className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.1em] text-cream uppercase hover:border-accent"
          >
            Command Center
          </Link>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Revenue Today</p>
              <p className="mt-1 font-display text-2xl text-accent">${briefing.today.revenue.toLocaleString()}</p>
              <p className="text-xs text-fog">pipeline estimate</p>
            </AdminPanel>
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Revenue MTD</p>
              <p className="mt-1 font-display text-2xl text-cream">${briefing.month.revenue.toLocaleString()}</p>
              <p className={`text-xs ${briefing.month.revenueChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {briefing.month.revenueChange >= 0 ? "+" : ""}
                {briefing.month.revenueChange}% vs last month
              </p>
            </AdminPanel>
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Projected Month</p>
              <p className="mt-1 font-display text-2xl text-cream">
                ${briefing.executive.projectedMonthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-fog">forecast from current pace</p>
            </AdminPanel>
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">At Risk</p>
              <p className="mt-1 font-display text-2xl text-cream">
                ${briefing.executive.potentialLostRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-fog">stale leads + inactive clients</p>
            </AdminPanel>
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Traffic</p>
              <p className="mt-1 font-display text-2xl text-cream">{briefing.traffic.visitors30.toLocaleString()}</p>
              <p className="text-xs text-fog">
                {briefing.traffic.conversionRate}% conv · {briefing.traffic.conversionChange >= 0 ? "+" : ""}
                {briefing.traffic.conversionChange}% change
              </p>
            </AdminPanel>
            <AdminPanel className="!p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Needs Attention</p>
              <p className="mt-1 font-display text-2xl text-cream">
                {briefing.followUp.inactiveClients.length + briefing.followUp.staleBookings.length}
              </p>
              <p className="text-xs text-fog">
                {briefing.followUp.galleriesAwaiting} galleries · {briefing.followUp.overdueInvoices} invoices
              </p>
            </AdminPanel>
          </div>

          {briefing.aiRecommendations.length > 0 && (
            <div className="mt-5 rounded-lg border border-accent/15 bg-ink/30 p-4">
              <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">AI Recommendations</p>
              <ul className="mt-2 space-y-1">
                {briefing.aiRecommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2 text-sm text-cream-dim">
                    <span className="mt-0.5 text-accent">→</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {briefing.weeklyPriorities.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Today&apos;s Priorities</p>
              <ul className="space-y-1.5">
                {briefing.weeklyPriorities.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-cream">
                    <span className="text-accent">◆</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {briefing.intelligence && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-stone/20 p-4">
                <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Risks</p>
                <ul className="mt-2 space-y-2">
                  {briefing.intelligence.risks.slice(0, 3).map((r) => (
                    <li key={r.id} className="text-sm text-cream-dim">
                      <span className="text-amber-400">{r.severity}</span> — {r.title}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-stone/20 p-4">
                <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Recent AI learnings</p>
                <ul className="mt-2 space-y-2">
                  {briefing.intelligence.recentLearnings.length > 0 ? (
                    briefing.intelligence.recentLearnings.map((l) => (
                      <li key={l} className="text-sm text-cream-dim">• {l}</li>
                    ))
                  ) : (
                    <li className="text-sm text-muted">Learning accumulates from verified business events.</li>
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-stone/20 p-4 lg:col-span-2">
                <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Performance snapshot</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-fog">
                  <p>{briefing.intelligence.websitePerformance.summary}</p>
                  <p>{briefing.intelligence.portfolioPerformance.summary}</p>
                  <p>{briefing.intelligence.sessionsPerformance.summary}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <ScoreRing label="Business" value={briefing.scores.businessHealth} />
            <ScoreRing label="Revenue" value={briefing.executiveScores?.find((s) => s.key === "revenue")?.value ?? briefing.scores.growth} />
            <ScoreRing label="Marketing" value={briefing.scores.marketing} />
            <ScoreRing label="Sales" value={briefing.scores.sales} />
            <ScoreRing label="Brand" value={briefing.executiveScores?.find((s) => s.key === "brand")?.value ?? briefing.scores.growth} />
            <ScoreRing label="Operations" value={briefing.executiveScores?.find((s) => s.key === "operations")?.value ?? briefing.scores.productivity} />
            <ScoreRing label="Clients" value={briefing.scores.customerSatisfaction} />
            <ScoreRing label="Productivity" value={briefing.scores.productivity} />
          </div>
        </>
      )}

      {briefing.recommendedActions.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Actionable Insights</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {briefing.recommendedActions.slice(0, compact ? 4 : 6).map((item) => (
              <ExecutiveInsightCard
                key={item.id}
                severity={item.severity}
                category={item.category}
                title={item.title}
                detail={item.detail}
                why={item.why}
                metric={item.metric}
                revenueImpact={item.revenueImpact}
                timeSavedMinutes={item.timeSavedMinutes}
                actions={item.actions}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
