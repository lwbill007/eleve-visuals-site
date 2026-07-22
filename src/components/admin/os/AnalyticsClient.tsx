"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
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
} from "@/components/admin/os/WorkspaceFrame";
import type { ConversionDashboard } from "@/lib/analytics-funnel";
import type { ExecutiveAnalyticsPayload } from "@/lib/executive-analytics";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import { cn } from "@/lib/utils";

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
  executive?: ExecutiveAnalyticsPayload;
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <span className={cn("text-xs", value >= 0 ? "text-emerald-400/90" : "text-red-400/90")}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

function ImpactBadge({ impact }: { impact: "high" | "medium" | "low" }) {
  const tone =
    impact === "high"
      ? "border-red-400/40 bg-red-400/10 text-red-200"
      : impact === "medium"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : "border-stone/30 text-fog";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[0.55rem] tracking-wider uppercase", tone)}>
      {impact} impact
    </span>
  );
}

export function AnalyticsClient() {
  useSetAIPage("analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const exec = data?.executive;
  const bookingChart =
    exec?.booking.steps.map((step) => ({
      month: step.label.slice(0, 14),
      value: step.count,
    })) ?? [];

  const plannedIntegrations =
    exec?.integrations.filter((item) => item.status === "planned") ?? [];

  return (
    <WorkspaceChrome
      eyebrow={osEyebrow("grow", "Is the business healthy?")}
      title="Analytics"
      description="Executive view — health at a glance, then what to do next."
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
        { label: "AI Briefing", href: "/admin/briefing", desc: "Weekly executive summary" },
        { label: "Opportunities", href: "/admin/opportunities", desc: "Growth actions" },
        { label: "Revenue Leaks", href: "/admin/leaks", desc: "Where money is lost" },
        { label: "Website Intelligence", href: "/admin/website", desc: "Site health drill-down" },
      ]}
    >
      {loading && !data ? (
        <WorkspaceLoading />
      ) : error ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : !data || !exec ? (
        <WorkspaceEmpty
          title="No analytics yet"
          detail="Executive metrics appear after visitors interact with the public site."
          actionHref="/"
          actionLabel="View site"
        />
      ) : (
        <div className="space-y-8">
          <section aria-label="Executive summary">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              {exec.summary.map((metric) => (
                <AdminMetricCard
                  key={metric.key}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.detail}
                  delta={metric.delta}
                  className="p-4"
                />
              ))}
            </div>
          </section>

          <AdminPanel title="AI Executive Brief" subtitle="What is happening and what matters now">
            <p className="text-sm leading-relaxed text-cream-dim">{exec.brief.narrative}</p>
            {exec.brief.priority ? (
              <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-4">
                <p className="text-[0.55rem] tracking-[0.12em] text-accent uppercase">
                  Priority {exec.brief.priority.rank}
                </p>
                <p className="mt-2 text-base text-cream">{exec.brief.priority.title}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-[0.55rem] tracking-wider text-muted uppercase">Estimated impact</p>
                    <p className="mt-1 text-fog">{exec.brief.priority.estimatedImpact}</p>
                  </div>
                  <div>
                    <p className="text-[0.55rem] tracking-wider text-muted uppercase">Confidence</p>
                    <p className="mt-1 text-fog">{exec.brief.priority.confidence}%</p>
                  </div>
                </div>
                {exec.brief.priority.href ? (
                  <Link
                    href={exec.brief.priority.href}
                    className="mt-4 inline-flex text-xs tracking-wider text-accent uppercase hover:underline"
                  >
                    Open action →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Revenue Funnel" subtitle="Visitors to revenue — each stage shows drop-off">
            <div className="space-y-2">
              {exec.revenueFunnel.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone/15 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-stone/30 text-xs text-muted">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm text-cream">{stage.label}</p>
                      {stage.id === "revenue" && stage.revenue != null ? (
                        <p className="text-xs text-fog">${stage.revenue.toLocaleString()} generated</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-cream">{stage.id === "revenue" ? stage.revenue != null ? `$${stage.revenue.toLocaleString()}` : "—" : stage.count.toLocaleString()}</span>
                    {stage.dropOffPct != null && stage.dropOffPct > 0 ? (
                      <span className="text-amber-200">↓ {stage.dropOffPct}%</span>
                    ) : null}
                    {stage.pctOfPrevious != null && index > 0 ? (
                      <span className="text-muted">{stage.pctOfPrevious}% of previous</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Traffic Intelligence" subtitle="Traffic with conversion context">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["Visitors", exec.traffic.visitors],
                  ["Sessions", exec.traffic.sessions],
                  ["Returning Visitors", exec.traffic.returningVisitors],
                  ["Average Engagement", exec.traffic.avgEngagement],
                ] as const
              ).map(([label, metric]) => (
                <div key={label} className="rounded-lg border border-stone/20 p-4">
                  <p className="text-[0.55rem] tracking-wider text-muted uppercase">{label}</p>
                  <p className="mt-2 font-display text-2xl text-cream">{metric.value}</p>
                  <div className="mt-2">
                    <Delta value={metric.delta} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 text-left text-[0.55rem] tracking-wider text-muted uppercase">
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Traffic</th>
                    <th className="py-2 pr-4">Conversion</th>
                    <th className="py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {exec.traffic.topSources.map((source) => (
                    <tr key={source.source} className="border-b border-stone/10">
                      <td className="py-3 pr-4 text-cream">{source.source}</td>
                      <td className="py-3 pr-4 text-fog">{source.traffic.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-fog">{source.conversionRate}%</td>
                      <td className="py-3 text-muted">
                        {source.revenue != null ? `$${source.revenue.toLocaleString()}` : "Not attributed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminPanel title="Portfolio Intelligence" subtitle="What creative work drives interest">
              {exec.portfolio.length === 0 ? (
                <p className="text-sm text-muted">No published portfolio items yet.</p>
              ) : (
                <div className="space-y-3">
                  {exec.portfolio.map((item) => (
                    <div key={item.id} className="rounded-lg border border-stone/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-cream">{item.title}</p>
                        <span className="text-xs text-fog">{item.views} views</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-fog sm:grid-cols-4">
                        <span>Conversion {item.conversionScore}</span>
                        <span>Engagement {item.engagementScore}</span>
                        <span>Bookings {item.bookings}</span>
                        <span>Revenue {item.revenue != null ? `$${item.revenue}` : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Session Intelligence" subtitle="Health score per session volume">
              {exec.sessions.length === 0 ? (
                <p className="text-sm text-muted">No published sessions yet.</p>
              ) : (
                <div className="space-y-3">
                  {exec.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-stone/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-cream">{session.title}</p>
                        <span className="rounded-full border border-accent/30 px-2 py-0.5 text-xs text-accent">
                          Health {session.health}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-fog sm:grid-cols-4">
                        <span>{session.views} views</span>
                        <span>{session.bookings} bookings</span>
                        <span>{session.conversionRate}% conv.</span>
                        <span>{session.avgViewMinutes != null ? `${session.avgViewMinutes}m avg` : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>

          <AdminPanel title="Booking Intelligence" subtitle="Where the booking flow breaks">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminMetricCard label="Started" value={exec.booking.started} className="p-4" />
              <AdminMetricCard label="Completed" value={exec.booking.completed} className="p-4" />
              <AdminMetricCard label="Completion Rate" value={`${exec.booking.completionRate}%`} className="p-4" />
              <AdminMetricCard
                label="Average Time"
                value={exec.booking.avgMinutes != null ? `${exec.booking.avgMinutes}m` : "—"}
                className="p-4"
              />
              <AdminMetricCard label="Abandonment Rate" value={`${exec.booking.abandonmentRate}%`} className="p-4" />
            </div>
            {exec.booking.biggestDrop ? (
              <p className="mt-4 text-sm text-amber-200">
                Biggest drop-off: {exec.booking.biggestDrop.label} ({exec.booking.biggestDrop.dropOffPct}%)
              </p>
            ) : null}
            {bookingChart.length > 0 ? (
              <div className="mt-6">
                <AdminBarChart data={bookingChart} labelKey="month" valueKey="value" accent />
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Marketing Intelligence" subtitle="Source performance — traffic, conversion, revenue">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 text-left text-[0.55rem] tracking-wider text-muted uppercase">
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Traffic</th>
                    <th className="py-2 pr-4">Bookings</th>
                    <th className="py-2">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {exec.marketing.map((row) => (
                    <tr key={row.source} className="border-b border-stone/10">
                      <td className="py-3 pr-4 text-cream">{row.source}</td>
                      <td className="py-3 pr-4 text-fog">{row.traffic.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-fog">{row.conversions}</td>
                      <td className="py-3 text-muted">{row.revenue != null ? `$${row.revenue}` : "Not connected"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminPanel title="Website Health" subtitle="Performance at a glance">
              <div className="grid grid-cols-2 gap-3">
                <AdminMetricCard
                  label="Performance"
                  value={exec.website.performance ?? "—"}
                  className="p-4"
                />
                <AdminMetricCard label="SEO" value={exec.website.seo ?? "—"} className="p-4" />
                <AdminMetricCard
                  label="Accessibility"
                  value={exec.website.accessibility ?? "—"}
                  className="p-4"
                />
                <AdminMetricCard
                  label="Overall"
                  value={exec.website.overall ?? "—"}
                  className="p-4"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="rounded-full border border-stone/30 px-3 py-1 text-fog">
                  Core Web Vitals · {exec.website.coreWebVitals.replace("_", " ")}
                </span>
                <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-emerald-200">
                  Deployment · {exec.website.deploymentStatus}
                </span>
              </div>
            </AdminPanel>

            <AdminPanel title="AI Opportunities" subtitle="Action list ranked by impact">
              {exec.opportunities.length === 0 ? (
                <p className="text-sm text-muted">No opportunities surfaced for this window.</p>
              ) : (
                <ul className="space-y-3">
                  {exec.opportunities.map((item) => (
                    <li key={item.id} className="rounded-lg border border-stone/15 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <ImpactBadge impact={item.impact} />
                        <p className="text-sm text-cream">{item.title}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-fog">
                        <span>Potential gain · {item.potentialGain}</span>
                        <span>Confidence · {item.confidence}%</span>
                      </div>
                      {item.href ? (
                        <Link href={item.href} className="mt-3 inline-flex text-xs text-accent hover:underline">
                          Review →
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>
          </div>

          {plannedIntegrations.length > 0 ? (
            <AdminPanel title="Integrations" subtitle="Connect advanced analytics when ready">
              <div className="flex flex-wrap gap-2">
                {plannedIntegrations.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full border border-stone/30 px-3 py-1.5 text-xs text-muted"
                  >
                    {item.label} · planned
                  </span>
                ))}
              </div>
            </AdminPanel>
          ) : null}
        </div>
      )}
    </WorkspaceChrome>
  );
}
