"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIDailyBriefing } from "@/lib/ai/types";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";

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

const severityBorder = {
  high: "border-red-500/25 hover:border-red-500/40",
  medium: "border-amber-500/25 hover:border-amber-500/40",
  low: "border-accent/20 hover:border-accent/35",
};

export function AIDailyBriefingPanel() {
  const [briefing, setBriefing] = useState<AIDailyBriefing | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load(force = false) {
    adminFetch(`/api/admin/ai/daily-briefing${force ? "?refresh=1" : ""}`)
      .then((r) => r.json())
      .then(setBriefing);
  }

  useEffect(() => {
    load();
  }, []);

  if (!briefing) {
    return (
      <div className="rounded-xl border border-accent/20 bg-charcoal/10 p-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-stone/30" />
        <div className="mt-4 h-24 rounded bg-stone/20" />
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 via-charcoal/20 to-transparent p-6">
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
          <button
            type="button"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              load(true);
              setTimeout(() => setRefreshing(false), 800);
            }}
            className="rounded-lg border border-stone/30 px-3 py-2 text-xs text-fog uppercase hover:border-accent"
          >
            Refresh
          </button>
          <Link
            href="/admin/insights"
            className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.1em] text-cream uppercase hover:border-accent"
          >
            All Insights
          </Link>
        </div>
      </div>

      {/* Revenue & activity grid */}
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
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Today</p>
          <p className="mt-1 font-display text-2xl text-cream">{briefing.today.bookings}</p>
          <p className="text-xs text-fog">
            bookings · {briefing.today.leads} leads · {briefing.today.applications} apps
          </p>
        </AdminPanel>
        <AdminPanel className="!p-4">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">New Contacts</p>
          <p className="mt-1 font-display text-2xl text-cream">{briefing.today.subscribers}</p>
          <p className="text-xs text-fog">subscribers / contacts today</p>
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
          <p className="mt-1 font-display text-2xl text-cream">{briefing.followUp.inactiveClients.length + briefing.followUp.staleBookings.length}</p>
          <p className="text-xs text-fog">
            {briefing.followUp.galleriesAwaiting} galleries · {briefing.followUp.overdueInvoices} invoices
          </p>
        </AdminPanel>
      </div>

      {/* AI Recommendations */}
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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <ScoreRing label="Business" value={briefing.scores.businessHealth} />
        <ScoreRing label="Marketing" value={briefing.scores.marketing} />
        <ScoreRing label="Sales" value={briefing.scores.sales} />
        <ScoreRing label="Productivity" value={briefing.scores.productivity} />
        <ScoreRing label="Clients" value={briefing.scores.customerSatisfaction} />
      </div>

      {briefing.recommendedActions.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Actionable Insights</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {briefing.recommendedActions.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-4 transition-colors ${severityBorder[item.severity as keyof typeof severityBorder] ?? severityBorder.low}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">
                      {item.category ?? "insight"} · {item.severity}
                      {item.metric ? ` · ${item.metric}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium text-cream">{item.title}</p>
                    <p className="mt-1 text-xs text-fog">{item.detail}</p>
                  </div>
                </div>
                {item.actions && item.actions.length > 0 && (
                  <BusinessActionBar actions={item.actions} compact className="mt-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
