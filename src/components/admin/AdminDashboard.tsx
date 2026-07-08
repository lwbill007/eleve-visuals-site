"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { ADMIN_QUICK_ACTIONS } from "@/config/admin-nav";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { TruthMetricCard } from "@/components/admin/ai/TruthMetricCard";
import {
  ExecutiveDashboardSkeleton,
  ExecutiveQuickLink,
} from "@/components/admin/os/ExecutiveOSComponents";
import { OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
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
  const { context: execContext } = useExecutiveContext();
  const [error, setError] = useState("");
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/os/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Could not load home."));
  }, []);

  const briefing = briefingCtx?.briefing;
  const loading = !data || Boolean(briefingCtx?.loading && !briefing);

  if (loading) {
    return <ExecutiveDashboardSkeleton />;
  }

  if (!data) {
    return <p className="text-fog">{error || "Could not load home."}</p>;
  }

  const { metrics, charts, activityFeed } = data;
  const executive = briefing?.executive;
  const tm = execContext?.truth.metrics;
  const health = execContext?.health;
  const sharedRecs = execContext?.recommendations ?? [];
  const sharedRisks = execContext?.risks ?? [];
  const oppTotal = sharedRecs.reduce((s, r) => s + r.estimatedRevenue, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="label-caps text-accent">Today</p>
        <h2 className="mt-1 font-display text-3xl text-cream sm:text-4xl">Home</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">
          {execContext?.headline ??
            briefing?.summary ??
            "Your next move, business health, and live activity — not a chart wall."}
        </p>
      </div>

      {health && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(
            [
              ["Overall", health.overall],
              ["Revenue", health.revenue],
              ["Sales", health.sales],
              ["Growth", health.growth],
              ["Data", health.data],
            ] as const
          ).map(([label, dim]) => (
            <div key={label} className="rounded-xl border border-stone/20 bg-charcoal/20 p-4" title={dim.note}>
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">{label}</p>
              <p className="mt-1 font-display text-3xl text-cream">{dim.score}</p>
              <p className="mt-1 text-[0.65rem] capitalize text-fog">{dim.label}</p>
            </div>
          ))}
        </div>
      )}

      {(sharedRecs.length > 0 || sharedRisks.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <OpportunityRevenueBanner total={oppTotal} count={sharedRecs.length} />
            {sharedRecs.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="os-panel block rounded-xl border border-stone/20 p-4 transition-colors hover:border-accent/35"
              >
                <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                  {r.priority} · {r.category}
                </p>
                <p className="mt-1 font-display text-base text-cream">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-fog">{r.why}</p>
                <p className="mt-2 text-[0.65rem] text-emerald-400/90">
                  {r.estimatedRevenue > 0 ? `~$${r.estimatedRevenue.toLocaleString()}` : "Impact TBD"} ·{" "}
                  {Math.round(r.confidence * 100)}% · ~{r.timeMinutes} min
                </p>
              </Link>
            ))}
          </div>
          <AdminPanel title="Needs attention" subtitle="From Truth Layer + connectors">
            <div className="space-y-3">
              {sharedRisks.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="block rounded-lg border border-stone/15 p-3 transition-colors hover:border-accent/30"
                >
                  <p className="text-[0.55rem] tracking-[0.12em] text-amber-300/90 uppercase">{r.severity}</p>
                  <p className="mt-1 text-sm text-cream">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fog">{r.detail}</p>
                </Link>
              ))}
              {sharedRisks.length === 0 && (
                <p className="text-sm text-fog">No elevated risks from current truth signals.</p>
              )}
              <Link href="/admin/risks" className="text-xs text-accent hover:underline">
                All risks →
              </Link>
            </div>
          </AdminPanel>
        </div>
      )}

      {executive && (
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard
            label="Projected Monthly Revenue"
            value={formatCurrency(executive.projectedMonthlyRevenue)}
            hint="Estimated from pipeline trajectory"
            href="/admin/pipeline"
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tm?.["revenue.mtd"] ? (
          <TruthMetricCard
            metric={tm["revenue.mtd"]}
            hint={
              briefing
                ? `${briefing.month.revenueChange >= 0 ? "+" : ""}${briefing.month.revenueChange}% vs last month`
                : metrics.revenue.hint
            }
            delta={briefing?.month.revenueChange ?? metrics.monthlyGrowth}
            href="/admin/analytics"
            currency
          />
        ) : (
          <AdminMetricCard
            label="Revenue MTD"
            value={formatCurrency(briefing?.month.revenue ?? metrics.revenue.value)}
            hint={metrics.revenue.hint}
            href="/admin/analytics"
          />
        )}
        {tm?.["bookings.total"] ? (
          <TruthMetricCard
            metric={tm["bookings.total"]}
            hint={`${metrics.bookings.pending} pending`}
            href="/admin/submissions?type=booking"
          />
        ) : (
          <AdminMetricCard
            label="Bookings"
            value={metrics.bookings.value}
            hint={`${metrics.bookings.pending} pending`}
            href="/admin/submissions?type=booking"
          />
        )}
        {tm?.["leads.total"] ? (
          <TruthMetricCard metric={tm["leads.total"]} hint={`${metrics.leads.thisMonth} this month`} href="/admin/crm" />
        ) : (
          <AdminMetricCard label="Leads" value={metrics.leads.value} href="/admin/crm" />
        )}
        {tm?.["sessions.applications"] ? (
          <TruthMetricCard
            metric={tm["sessions.applications"]}
            hint={`${metrics.applications.pending} pending review`}
            href="/admin/applications"
          />
        ) : (
          <AdminMetricCard
            label="Applications"
            value={metrics.applications.value}
            hint={`${metrics.applications.pending} pending`}
            href="/admin/applications"
          />
        )}
      </div>

      {metrics.pendingTasks > 0 && (
        <Link
          href="/admin/pipeline"
          className="os-panel flex items-center justify-between rounded-xl border border-accent/30 px-5 py-4 transition-colors hover:border-accent/45 hover:bg-accent/5"
        >
          <span className="text-sm text-cream">
            <span className="font-medium text-accent">{metrics.pendingTasks}</span> urgent tasks need attention
          </span>
          <span className="text-xs text-accent">Open pipeline →</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <AdminPanel title="Recent activity" subtitle="Latest business events" className="lg:col-span-7">
          <AdminActivityFeed items={activityFeed} />
        </AdminPanel>
        <AdminPanel title="Quick actions" subtitle="Highest-impact workflows" className="lg:col-span-5">
          <div className="grid gap-2">
            {ADMIN_QUICK_ACTIONS.map((action) => (
              <ExecutiveQuickLink key={action.href + action.label} {...action} />
            ))}
          </div>
        </AdminPanel>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTrends((v) => !v)}
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-accent"
        >
          {showTrends ? "Hide trends" : "Show trends"}
        </button>
        {showTrends && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Bookings by month" subtitle="Last 6 months">
              <AdminBarChart data={charts.bookingsByMonth} labelKey="month" valueKey="value" accent />
            </AdminPanel>
            <AdminPanel title="Session applications" subtitle="Volume interest">
              <AdminBarChart data={charts.applicationsByMonth} labelKey="month" valueKey="value" />
            </AdminPanel>
            <AdminPanel title="Website visitors" subtitle="Pageviews by month">
              <AdminBarChart data={charts.visitorsByMonth} labelKey="month" valueKey="value" />
            </AdminPanel>
            <AdminPanel title="Lead sources" subtitle="Where bookings originate">
              {charts.leadSources.length === 0 ? (
                <p className="text-sm text-muted">No source data yet.</p>
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
        )}
      </div>
    </div>
  );
}
