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
import type { ConversionDashboard } from "@/lib/analytics-funnel";

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
  conversion?: ConversionDashboard;
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

  const c = data?.conversion;
  const sourceChart =
    data?.topSources.slice(0, 6).map((s) => ({ month: s.source.slice(0, 12), value: s.visits })) ?? [];
  const funnelChart =
    c?.funnel.map((s) => ({ month: s.label.slice(0, 14), value: s.count })) ?? [];

  const pages = (data?.topPages ?? []).filter((p) =>
    q.trim() ? p.path.toLowerCase().includes(q.trim().toLowerCase()) : true
  );

  return (
    <WorkspaceChrome
      eyebrow="Grow"
      title="Analytics"
      description="Conversion Dashboard — first-party funnel from homepage to inquiry. Measure drop-off, then optimize."
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
        { label: "Website Intel", href: "/admin/website", desc: "SEO · UX · convert" },
        { label: "Homepage", href: "/admin/homepage", desc: "CMS · experiments" },
        { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
        { label: "Revenue Leaks", href: "/admin/leaks", desc: "Lost $" },
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
          <AdminPanel
            title="Conversion Dashboard"
            subtitle="Visitors → inquiry. Rates are first-party only."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard label="Visitors" value={(c?.visitors ?? data.totals.uniqueSessions).toLocaleString()} />
              <AdminMetricCard label="Hero CTR" value={`${c?.heroCtr ?? 0}%`} hint="Hero clicks / homepage" />
              <AdminMetricCard label="Booking starts" value={(c?.bookingStarts ?? 0).toLocaleString()} />
              <AdminMetricCard
                label="Inquiry completion"
                value={`${c?.inquiryCompletionRate ?? 0}%`}
                hint="Submits / booking starts"
              />
              <AdminMetricCard label="Booking completions" value={(c?.bookingCompletions ?? data.conversions.booking).toLocaleString()} />
              <AdminMetricCard label="Booking start rate" value={`${c?.bookingStartRate ?? 0}%`} />
              <AdminMetricCard
                label="Portfolio → inquiry"
                value={`${c?.portfolioToInquiryRate ?? 0}%`}
              />
              <AdminMetricCard
                label="Session → inquiry"
                value={`${c?.sessionToInquiryRate ?? 0}%`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-stone/20 p-4 text-sm">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Avg completion time</p>
                <p className="mt-1 font-display text-2xl text-cream">
                  {c?.avgCompletionMinutes != null ? `${c.avgCompletionMinutes}m` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-stone/20 p-4 text-sm">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Top traffic source</p>
                <p className="mt-1 text-cream">
                  {c?.topTrafficSource
                    ? `${c.topTrafficSource.source} (${c.topTrafficSource.visits})`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-stone/20 p-4 text-sm">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Device mix</p>
                <p className="mt-1 text-cream">
                  {c?.mobileSharePct != null
                    ? `Mobile ${c.mobileSharePct}% · Desktop ${c.desktopSharePct}%`
                    : "Collecting…"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-stone/20 p-4 text-sm">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Most-viewed session</p>
                <p className="mt-1 truncate text-cream">
                  {c?.mostViewedSession
                    ? `${c.mostViewedSession.path} (${c.mostViewedSession.views})`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-stone/20 p-4 text-sm">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Most-clicked portfolio</p>
                <p className="mt-1 truncate text-cream">
                  {c?.mostClickedPortfolio
                    ? `${c.mostClickedPortfolio.path} (${c.mostClickedPortfolio.views})`
                    : "—"}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Funnel drop-off" subtitle="Where visitors abandon the path to inquiry">
            {funnelChart.length > 0 && (
              <AdminBarChart data={funnelChart} labelKey="month" valueKey="value" accent />
            )}
            <ul className="mt-4 space-y-2 text-sm">
              {(c?.funnel ?? []).map((step) => (
                <li
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-stone/10 py-2"
                >
                  <span className="text-fog">{step.label}</span>
                  <span className="text-cream">
                    {step.count}
                    {step.dropOffPct != null && step.dropOffPct > 0 ? (
                      <span className="ml-2 text-amber-200/90">↓ {step.dropOffPct}%</span>
                    ) : null}
                    <span className="ml-2 text-muted">{step.conversionFromStartPct}% of start</span>
                  </span>
                </li>
              ))}
            </ul>
            {c?.note && <p className="mt-3 text-xs text-muted">{c.note}</p>}
          </AdminPanel>

          <AdminPanel
            title="Lighthouse targets"
            subtitle="Verify after each release — not live scores"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              {(
                [
                  ["Performance", c?.lighthouseTargets.performance ?? 95],
                  ["Accessibility", c?.lighthouseTargets.accessibility ?? 95],
                  ["Best Practices", c?.lighthouseTargets.bestPractices ?? 100],
                  ["SEO", c?.lighthouseTargets.seo ?? 100],
                ] as const
              ).map(([label, target]) => (
                <div key={label} className="rounded-lg border border-stone/20 p-3 text-center">
                  <p className="font-display text-xl text-cream">≥{target}</p>
                  <p className="text-[0.55rem] tracking-[0.08em] text-muted uppercase">{label}</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Pageviews" value={data.totals.pageviews.toLocaleString()} />
            <AdminMetricCard label="Sessions" value={data.totals.uniqueSessions.toLocaleString()} />
            <AdminMetricCard label="Conversions" value={data.totals.conversions.toLocaleString()} />
            <AdminMetricCard
              label="Legacy conv. rate"
              value={`${data.totals.conversionRate}%`}
              hint="Inquiry pageviews → conversions"
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
            <WorkspaceToolbar search={q} onSearch={setQ} searchPlaceholder="Filter paths…" />
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

          <AdminPanel title="AI analysis" subtitle="Explain numbers — review before acting">
            <AIGeneratePanel
              task="analytics_explain"
              label="Analytics insight"
              prompt="Explain this analytics and conversion funnel with summary, drop-off risks, and next experiment."
              context={{
                periodDays: data.periodDays,
                totals: data.totals,
                conversions: data.conversions,
                conversion: data.conversion,
                topPages: data.topPages,
              }}
            />
          </AdminPanel>
        </div>
      )}
    </WorkspaceChrome>
  );
}
