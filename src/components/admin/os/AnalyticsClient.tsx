"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import {
  AdminBarChart,
  AdminMetricCard,
  AdminPanel,
} from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";

interface AnalyticsData {
  periodDays: number;
  totals: {
    pageviews: number;
    uniqueSessions: number;
    conversions: number;
    conversionRate: number;
  };
  conversions: { booking: number; contact: number; session: number };
  topPages: { path: string; views: number }[];
  topSources: { source: string; visits: number }[];
}

export function AnalyticsClient() {
  useSetAIPage("analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceChart =
    data?.topSources.slice(0, 6).map((s) => ({ month: s.source.slice(0, 12), value: s.visits })) ?? [];

  const pages = (data?.topPages ?? []).filter((p) =>
    q.trim() ? p.path.toLowerCase().includes(q.trim().toLowerCase()) : true
  );

  return (
    <WorkspaceChrome
      eyebrow="Grow"
      title="Analytics"
      description="What happened on the site, why traffic converted (or didn’t), and what to fix next — first-party events only."
      onRefresh={() => void load()}
      refreshing={loading}
      extra={
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-stone/30 bg-charcoal px-3 py-2 text-sm text-cream"
          aria-label="Date range"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      }
      related={[
        { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
        { label: "Homepage", href: "/admin/homepage", desc: "Site CMS" },
        { label: "Revenue Leaks", href: "/admin/leaks", desc: "Lost $" },
        { label: "Business Brain", href: "/admin/memory", desc: "Context" },
      ]}
    >
      {loading && !data ? (
        <WorkspaceLoading />
      ) : error ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : !data ? (
        <WorkspaceEmpty
          title="No analytics yet"
          detail="Pageviews and conversions appear after visitors hit the public site."
          actionHref="/"
          actionLabel="View site"
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Pageviews" value={data.totals.pageviews.toLocaleString()} />
            <AdminMetricCard label="Sessions" value={data.totals.uniqueSessions.toLocaleString()} />
            <AdminMetricCard label="Conversions" value={data.totals.conversions.toLocaleString()} />
            <AdminMetricCard
              label="Conversion rate"
              value={`${data.totals.conversionRate}%`}
              hint={`${days}-day window`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Top sources" subtitle="Where visitors arrive">
              {sourceChart.length === 0 ? (
                <p className="text-sm text-muted">No source data in this window.</p>
              ) : (
                <AdminBarChart data={sourceChart} labelKey="month" valueKey="value" accent />
              )}
            </AdminPanel>
            <AdminPanel title="Conversions by type">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between text-fog">
                  <span>Booking</span>
                  <span className="text-cream">{data.conversions.booking}</span>
                </li>
                <li className="flex justify-between text-fog">
                  <span>Contact</span>
                  <span className="text-cream">{data.conversions.contact}</span>
                </li>
                <li className="flex justify-between text-fog">
                  <span>Session app</span>
                  <span className="text-cream">{data.conversions.session}</span>
                </li>
              </ul>
            </AdminPanel>
          </div>

          <AdminPanel title="Top pages">
            <WorkspaceToolbar
              search={q}
              onSearch={setQ}
              searchPlaceholder="Filter paths…"
            />
            {pages.length === 0 ? (
              <p className="text-sm text-muted">No pages match.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pages.slice(0, 12).map((p) => (
                  <li key={p.path} className="flex justify-between gap-4 border-b border-stone/10 py-2">
                    <span className="truncate text-fog">{p.path}</span>
                    <span className="shrink-0 text-cream">{p.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel title="Client journey" subtitle="Intended funnel · live rate is end-to-end">
            <div className="flex flex-wrap items-center gap-2 text-xs tracking-[0.12em] text-fog uppercase">
              {["Visitor", "Inquiry", "Lead", "Booking", "Shoot", "Gallery", "Review", "Repeat"].map(
                (step, i, arr) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-full border border-stone/40 px-3 py-1.5 text-cream">{step}</span>
                    {i < arr.length - 1 && <span className="text-muted">→</span>}
                  </span>
                )
              )}
            </div>
            <p className="mt-4 text-sm text-muted">
              Live conversion rate: {data.totals.conversionRate}%. Per-step drop-off needs form_step
              events on every stage — until then this is the verified end-to-end signal.
            </p>
          </AdminPanel>

          <AdminPanel title="AI analysis" subtitle="Explain numbers — review before acting">
            <AIGeneratePanel
              task="analytics_explain"
              label="Analytics insight"
              prompt="Explain this analytics data with summary, trend, reason, recommendation, opportunity, and risk."
              context={{
                periodDays: data.periodDays,
                totals: data.totals,
                conversions: data.conversions,
                topPages: data.topPages,
              }}
            />
          </AdminPanel>
        </div>
      )}
    </WorkspaceChrome>
  );
}
