"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import {
  AdminBarChart,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/os/AdminOSComponents";

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

  useEffect(() => {
    adminFetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setData);
  }, [days]);

  if (!data) return <p className="text-fog">Loading analytics…</p>;

  const sourceChart = data.topSources.slice(0, 6).map((s) => ({ month: s.source.slice(0, 12), value: s.visits }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Command Center"
        title="Analytics"
        description="Website traffic, conversions, and lead sources."
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-stone/30 bg-charcoal px-3 py-2 text-sm text-cream"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Pageviews" value={data.totals.pageviews.toLocaleString()} />
        <AdminMetricCard label="Unique Sessions" value={data.totals.uniqueSessions.toLocaleString()} />
        <AdminMetricCard label="Conversions" value={data.totals.conversions} />
        <AdminMetricCard label="Conversion Rate" value={`${data.totals.conversionRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Conversions by Type">
          <ul className="space-y-3">
            <li className="flex justify-between text-sm">
              <span className="text-fog">Bookings</span>
              <span className="text-cream">{data.conversions.booking}</span>
            </li>
            <li className="flex justify-between text-sm">
              <span className="text-fog">Contact</span>
              <span className="text-cream">{data.conversions.contact}</span>
            </li>
            <li className="flex justify-between text-sm">
              <span className="text-fog">Session Applications</span>
              <span className="text-cream">{data.conversions.session}</span>
            </li>
          </ul>
        </AdminPanel>

        <AdminPanel title="Traffic Sources">
          {sourceChart.length > 0 ? (
            <AdminBarChart data={sourceChart} labelKey="month" valueKey="value" accent />
          ) : (
            <p className="text-sm text-muted">No traffic data yet.</p>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Top Pages">
        <ul className="space-y-2">
          {data.topPages.map((p) => (
            <li key={p.path} className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-cream-dim">{p.path}</span>
              <span className="shrink-0 text-cream">{p.views}</span>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title="Client Journey" subtitle="Track drop-off across the funnel">
        <div className="flex flex-wrap items-center gap-2 text-xs tracking-[0.12em] text-fog uppercase">
          {["Visitor", "Inquiry", "Lead", "Booking", "Shoot", "Gallery", "Review", "Repeat"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-stone/40 px-3 py-1.5 text-cream">{step}</span>
              {i < arr.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Funnel stages above are the intended client journey. Live conversion rate from first-party
          analytics: {data.totals.conversionRate}%. Step-by-step drop-off counts require form_step
          events on every stage — until then this rate is the verified end-to-end signal.
        </p>
      </AdminPanel>

      <AdminPanel title="AI Analysis" subtitle="ÉLEVÉ AI explains your numbers">
        <AIGeneratePanel
          task="analytics_explain"
          label="Analytics insight"
          prompt="Explain this analytics data with summary, trend, reason, recommendation, opportunity, and risk."
          context={{
            periodDays: data.periodDays,
            totals: data.totals,
            conversions: data.conversions,
            topPages: data.topPages,
            topSources: data.topSources,
          }}
          buttonLabel="Explain with AI"
        />
      </AdminPanel>
    </div>
  );
}
