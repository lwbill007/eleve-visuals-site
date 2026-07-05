"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { ADMIN_QUICK_ACTIONS } from "@/config/admin-nav";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import {
  ExecutiveDashboardSkeleton,
  ExecutiveQuickLink,
  HighestRoiBanner,
} from "@/components/admin/os/ExecutiveOSComponents";
import {
  ExecutiveScoreGrid,
  OpportunityCard,
  OpportunityRevenueBanner,
  RiskCard,
} from "@/components/admin/os/ExecutiveIntelligenceComponents";
import {
  AdminActivityFeed,
  AdminBarChart,
  AdminMetricCard,
  AdminPanel,
} from "@/components/admin/os/AdminOSComponents";

interface DashboardOS {
  metrics: {
    revenue: { value: number; label: string; hint: string };
    bookings: { value: number; pending: number };
    leads: { value: number; thisMonth: number };
    visitors: { value: number; week: number };
    subscribers: { value: number; label: string };
    applications: { value: number; pending: number };
    returningClients: number;
    conversionRate: number;
    monthlyGrowth: number;
    pendingTasks: number;
  };
  charts: {
    bookingsByMonth: { month: string; value: number }[];
    applicationsByMonth: { month: string; value: number }[];
    leadsByMonth: { month: string; value: number }[];
    visitorsByMonth: { month: string; value: number }[];
    leadSources: { source: string; count: number }[];
  };
  activityFeed: {
    id: string;
    label: string;
    name?: string;
    href: string;
    read: boolean;
    createdAt: string;
  }[];
}

function formatCurrency(n: number) {
  if (n >= 1000) return `$${Math.round(n / 100) / 10}k`;
  return n > 0 ? `$${n.toLocaleString()}` : "—";
}

export function AdminDashboard() {
  useSetAIPage("dashboard");
  const briefingCtx = useBriefingOptional();
  const [data, setData] = useState<DashboardOS | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/os/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Could not load command center."));
  }, []);

  const briefing = briefingCtx?.briefing;
  const loading = !data || Boolean(briefingCtx?.loading && !briefing);

  if (loading) {
    return <ExecutiveDashboardSkeleton />;
  }

  if (!data) {
    return <p className="text-fog">{error || "Could not load command center."}</p>;
  }

  const { metrics, charts, activityFeed } = data;
  const executive = briefing?.executive;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-caps text-accent">ÉLEVÉ OS</p>
        <h2 className="mt-1 font-display text-3xl text-cream sm:text-4xl">Executive Command Center</h2>
        {briefing && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fog">{briefing.summary}</p>
        )}
      </div>

      {executive?.highestRoiAction && (
        <HighestRoiBanner {...executive.highestRoiAction} />
      )}

      {briefing?.executiveScores && briefing.executiveScores.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="label-caps text-muted">Business health scores</p>
            <Link href="/admin/intelligence" className="text-xs text-accent hover:underline">
              Full intelligence →
            </Link>
          </div>
          <ExecutiveScoreGrid scores={briefing.executiveScores} />
        </div>
      ) : null}

      {briefing?.intelligence && (
        <div className="grid gap-4 lg:grid-cols-2">
          <OpportunityRevenueBanner
            total={briefing.intelligence.opportunities.reduce((s, o) => s + o.expectedRevenue, 0)}
            count={briefing.intelligence.opportunities.length}
          />
          <AdminPanel title="Active risks" subtitle="Early warnings — act before problems compound">
            <div className="space-y-3">
              {briefing.intelligence.risks.slice(0, 2).map((r) => (
                <RiskCard key={r.id} risk={r} />
              ))}
              {briefing.intelligence.risks.length === 0 && (
                <p className="text-sm text-fog">No critical risks detected from current data.</p>
              )}
              <Link href="/admin/risks" className="text-xs text-accent hover:underline">
                Risk Center →
              </Link>
            </div>
          </AdminPanel>
        </div>
      )}

      {briefing?.intelligence && briefing.intelligence.opportunities.length > 0 && (
        <AdminPanel title="Top opportunities" subtitle="Ranked by expected revenue × confidence">
          <div className="grid gap-3 lg:grid-cols-2">
            {briefing.intelligence.opportunities.slice(0, 4).map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </AdminPanel>
      )}

      {executive && (
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard
            label="Projected Monthly Revenue"
            value={formatCurrency(executive.projectedMonthlyRevenue)}
            hint="Based on current pipeline trajectory"
            href="/admin/bookings-ai"
          />
          <AdminMetricCard
            label="Potential Lost Revenue"
            value={formatCurrency(executive.potentialLostRevenue)}
            hint="Stale inquiries + inactive clients"
            href="/admin/pipeline"
          />
          <AdminMetricCard
            label="Pipeline Value"
            value={formatCurrency(executive.pipelineValue)}
            hint={metrics.revenue.hint}
            href="/admin/pipeline"
          />
        </div>
      )}

      {briefing && briefing.weeklyPriorities.length > 0 && (
        <AdminPanel title="Today's Priorities" subtitle="Ranked by revenue impact">
          <ul className="space-y-2">
            {briefing.weeklyPriorities.map((p, i) => (
              <li key={p} className="flex items-start gap-3 text-sm text-cream">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[0.65rem] text-accent">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Revenue MTD"
          value={formatCurrency(briefing?.month.revenue ?? metrics.revenue.value)}
          hint={
            briefing
              ? `${briefing.month.revenueChange >= 0 ? "+" : ""}${briefing.month.revenueChange}% vs last month`
              : metrics.revenue.hint
          }
          delta={briefing?.month.revenueChange ?? metrics.monthlyGrowth}
          href="/admin/analytics"
        />
        <AdminMetricCard
          label="Bookings"
          value={metrics.bookings.value}
          hint={`${metrics.bookings.pending} pending inquiry`}
          delta={metrics.monthlyGrowth}
          href="/admin/submissions?type=booking"
        />
        <AdminMetricCard label="Leads" value={metrics.leads.value} hint={`${metrics.leads.thisMonth} this month`} href="/admin/crm" />
        <AdminMetricCard
          label="Visitors (30d)"
          value={metrics.visitors.value.toLocaleString()}
          hint={`${metrics.visitors.week} this week · ${metrics.conversionRate}% conv`}
          href="/admin/analytics"
        />
        <AdminMetricCard
          label="Contacts"
          value={metrics.subscribers.value}
          hint={metrics.subscribers.label}
          href="/admin/crm"
        />
        <AdminMetricCard
          label="Applications"
          value={metrics.applications.value}
          hint={`${metrics.applications.pending} pending review`}
          href="/admin/applications"
        />
        <AdminMetricCard label="Returning Clients" value={metrics.returningClients} href="/admin/crm" />
        <AdminMetricCard
          label="Today"
          value={briefing?.today.bookings ?? "—"}
          hint={
            briefing
              ? `${briefing.today.leads} leads · ${briefing.today.applications} apps · $${briefing.today.revenue.toLocaleString()} pipeline`
              : "Live activity"
          }
          href="/admin/pipeline"
        />
      </div>

      {metrics.pendingTasks > 0 && (
        <Link
          href="/admin/pipeline"
          className="os-panel flex items-center justify-between rounded-xl border border-accent/30 px-5 py-4 transition-colors hover:border-accent/45 hover:bg-accent/5"
        >
          <span className="text-sm text-cream">
            <span className="font-medium text-accent">{metrics.pendingTasks}</span> urgent tasks need attention
          </span>
          <span className="text-xs text-accent">Review pipeline →</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <AdminPanel title="Recent Activity" subtitle="Latest business events" className="lg:col-span-7">
          <AdminActivityFeed items={activityFeed} />
        </AdminPanel>

        <AdminPanel title="Quick Actions" subtitle="Highest-impact workflows" className="lg:col-span-5">
          <div className="grid gap-2">
            {ADMIN_QUICK_ACTIONS.map((action) => (
              <ExecutiveQuickLink key={action.href + action.label} {...action} />
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Bookings by Month" subtitle="Last 6 months">
          <AdminBarChart data={charts.bookingsByMonth} labelKey="month" valueKey="value" accent />
        </AdminPanel>
        <AdminPanel title="Session Applications" subtitle="Volume interest over time">
          <AdminBarChart data={charts.applicationsByMonth} labelKey="month" valueKey="value" />
        </AdminPanel>
        <AdminPanel title="Website Visitors" subtitle="Pageviews by month">
          <AdminBarChart data={charts.visitorsByMonth} labelKey="month" valueKey="value" />
        </AdminPanel>
        <AdminPanel title="Lead Sources" subtitle="Where bookings originate">
          {charts.leadSources.length === 0 ? (
            <p className="text-sm text-muted">No source data yet — add referral source to booking forms.</p>
          ) : (
            <ul className="space-y-3">
              {charts.leadSources.map((s) => (
                <li key={s.source} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate text-cream-dim">{s.source}</span>
                  <span className="shrink-0 font-display text-lg text-cream">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
