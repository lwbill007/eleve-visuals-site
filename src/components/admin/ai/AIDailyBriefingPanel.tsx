"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIDailyBriefing } from "@/lib/ai/types";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

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
        <div className="h-5 w-40 rounded bg-stone/30" />
        <div className="mt-4 h-24 rounded bg-stone/20" />
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 via-charcoal/20 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-accent">AI Daily Briefing</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cream-dim">{briefing.summary}</p>
          <p className="mt-1 text-xs text-muted">
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
            href="/admin/assistant"
            className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.1em] text-cream uppercase hover:border-accent"
          >
            Full Assistant
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminPanel className="!p-4">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Yesterday</p>
          <p className="mt-1 font-display text-2xl text-cream">{briefing.yesterday.bookings}</p>
          <p className="text-xs text-fog">bookings · ~${briefing.yesterday.revenue.toLocaleString()} pipeline</p>
        </AdminPanel>
        <AdminPanel className="!p-4">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Today</p>
          <p className="mt-1 font-display text-2xl text-cream">{briefing.today.bookings}</p>
          <p className="text-xs text-fog">
            {briefing.today.leads} leads · {briefing.today.applications} apps · {briefing.today.subscribers} contacts
          </p>
        </AdminPanel>
        <AdminPanel className="!p-4">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Follow-up</p>
          <p className="mt-1 font-display text-2xl text-cream">{briefing.followUp.inactiveClients.length}</p>
          <p className="text-xs text-fog">{briefing.followUp.staleBookings.length} abandoned inquiries</p>
        </AdminPanel>
        <AdminPanel className="!p-4">
          <p className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Health Score</p>
          <p className="mt-1 font-display text-2xl text-accent">{briefing.scores.businessHealth}</p>
          <p className="text-xs text-fog">Forecast: {briefing.forecast.bookings}</p>
        </AdminPanel>
      </div>

      {briefing.weeklyPriorities.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[0.6rem] tracking-[0.14em] text-muted uppercase">Weekly Priorities</p>
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
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {briefing.recommendedActions.slice(0, 4).map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-lg border border-stone/25 p-3 transition-colors hover:border-accent/30"
            >
              <p className="text-xs text-accent uppercase">{action.severity} priority</p>
              <p className="mt-1 text-sm text-cream">{action.title}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
