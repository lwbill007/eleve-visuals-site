"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { ADMIN_QUICK_ACTIONS } from "@/config/admin-nav";
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
  const [data, setData] = useState<DashboardOS | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/os/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Could not load dashboard."));
  }, []);

  if (!data) {
    return <p className="text-fog">{error || "Loading command center…"}</p>;
  }

  const { metrics, charts, activityFeed } = data;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-caps text-accent">Command Center</p>
        <h2 className="mt-1 font-display text-3xl text-cream sm:text-4xl">Good to see you.</h2>
        <p className="mt-2 max-w-2xl text-sm text-fog">
          Your studio operating system — bookings, sessions, marketing, and performance in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Pipeline Value"
          value={formatCurrency(metrics.revenue.value)}
          hint={metrics.revenue.hint}
          href="/admin/pipeline"
        />
        <AdminMetricCard
          label="Bookings"
          value={metrics.bookings.value}
          hint={`${metrics.bookings.pending} pending`}
          delta={metrics.monthlyGrowth}
          href="/admin/submissions?type=booking"
        />
        <AdminMetricCard label="Leads" value={metrics.leads.value} hint={`${metrics.leads.thisMonth} this month`} href="/admin/crm" />
        <AdminMetricCard
          label="Visitors (30d)"
          value={metrics.visitors.value.toLocaleString()}
          hint={`${metrics.visitors.week} this week`}
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
        <AdminMetricCard
          label="Returning Clients"
          value={metrics.returningClients}
          href="/admin/crm"
        />
        <AdminMetricCard
          label="Conversion"
          value={`${metrics.conversionRate}%`}
          hint="Inquiry page → submission"
          href="/admin/analytics"
        />
      </div>

      {metrics.pendingTasks > 0 && (
        <Link
          href="/admin/pipeline"
          className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-5 py-4 transition-colors hover:bg-accent/10"
        >
          <span className="text-sm text-cream">
            <span className="font-medium text-accent">{metrics.pendingTasks}</span> pending tasks need attention
          </span>
          <span className="text-xs text-accent">Review →</span>
        </Link>
      )}

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

      <div className="grid gap-4 lg:grid-cols-12">
        <AdminPanel title="Recent Activity" subtitle="Latest business events" className="lg:col-span-7">
          <AdminActivityFeed items={activityFeed} />
        </AdminPanel>

        <AdminPanel title="Quick Actions" subtitle="Move fast" className="lg:col-span-5">
          <div className="grid gap-2">
            {ADMIN_QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="rounded-lg border border-stone/20 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-charcoal/30"
              >
                <p className="text-sm text-cream">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted">{action.desc}</p>
              </Link>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
