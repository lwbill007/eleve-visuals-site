"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { ADMIN_QUICK_ACTIONS } from "@/config/admin-nav";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { TruthMetricCard } from "@/components/admin/ai/TruthMetricCard";
import { WorkspaceChrome, WorkspaceError } from "@/components/admin/os/WorkspaceFrame";
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
import { DEFAULT_SITE_CONFIG } from "@/lib/defaults";

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

const RELATED = [
  { label: "AI Briefing", href: "/admin/briefing", desc: "Full brief" },
  { label: "Opportunities", href: "/admin/opportunities", desc: "Execute" },
  { label: "Workboard", href: "/admin/workboard", desc: "Inbox" },
  { label: "Business Brain", href: "/admin/memory", desc: "Knowledge" },
];

export function AdminDashboard() {
  useSetAIPage("dashboard");
  const briefingCtx = useBriefingOptional();
  const [data, setData] = useState<DashboardOS | null>(null);
  const { context: execContext } = useExecutiveContext();
  const [error, setError] = useState("");
  const [loadingDash, setLoadingDash] = useState(true);
  const [showTrends, setShowTrends] = useState(false);

  const load = useCallback(() => {
    setLoadingDash(true);
    setError("");
    adminFetch("/api/admin/os/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch(() => {
        setError("Could not load home.");
        setData(null);
      })
      .finally(() => setLoadingDash(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const briefing = briefingCtx?.briefing;
  // Don't block Command Center on briefing — dashboard metrics are the primary payload.
  const loading = loadingDash;

  const creator = DEFAULT_SITE_CONFIG.creator || "Bill";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${creator}` : hour < 17 ? `Good afternoon, ${creator}` : `Good evening, ${creator}`;

  const description =
    execContext?.headline ??
    briefing?.summary ??
    "What happened, why it matters, what to do next, the money at stake, the cost of ignoring it, and how confident we are.";

  if (loading) {
    return (
      <WorkspaceChrome
        eyebrow="Command · Executive"
        title={greeting}
        description={description}
        onRefresh={load}
        refreshing
        related={RELATED}
      >
        <ExecutiveDashboardSkeleton />
      </WorkspaceChrome>
    );
  }

  if (!data) {
    return (
      <WorkspaceChrome
        eyebrow="Command · Executive"
        title={greeting}
        description={description}
        onRefresh={load}
        related={RELATED}
      >
        <WorkspaceError message={error || "Could not load home."} onRetry={load} />
      </WorkspaceChrome>
    );
  }

  const { metrics, charts, activityFeed } = data;
  const executive = briefing?.executive;
  const tm = execContext?.truth.metrics;
  const health = execContext?.health;
  const sharedRecs = execContext?.recommendations ?? [];
  const sharedRisks = execContext?.risks ?? [];
  const confidence = execContext?.confidence;
  const leaks = execContext?.leaks;
  const next = execContext?.nextAction ?? sharedRecs[0] ?? null;
  const oppTotal = sharedRecs.reduce((s, r) => s + r.estimatedRevenue, 0);
  const ignoreCost =
    next?.costOfIgnore?.estimatedRevenueLoss ??
    ((next?.estimatedRevenue ?? 0) > 0
      ? next!.estimatedRevenue
      : (leaks?.loss ?? executive?.potentialLostRevenue ?? 0));

  return (
    <WorkspaceChrome
      eyebrow="Command · Executive"
      title={greeting}
      description={description}
      onRefresh={load}
      refreshing={loadingDash}
      related={RELATED}
    >
      <div className="space-y-10">
        {/* First viewport: one executive composition — six questions */}
        <section className="rounded-2xl border border-accent/25 bg-accent/[0.03] p-5 sm:p-7">
          <p className="text-[0.55rem] tracking-[0.16em] text-accent uppercase">Top priority today</p>
          {next ? (
            <>
              <h2 className="mt-2 max-w-3xl font-display text-2xl text-cream sm:text-3xl">{next.title}</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">What happened</dt>
                  <dd className="mt-1 text-sm text-cream-dim">{execContext?.headline ?? briefing?.summary ?? next.title}</dd>
                </div>
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Why</dt>
                  <dd className="mt-1 text-sm text-cream-dim">{next.why}</dd>
                </div>
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">What to do next</dt>
                  <dd className="mt-1 text-sm text-cream-dim">{next.actionLabel}</dd>
                </div>
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Money involved</dt>
                  <dd className="mt-1 font-display text-xl text-emerald-400">
                    {next.estimatedRevenue > 0
                      ? `~$${next.estimatedRevenue.toLocaleString()}`
                      : oppTotal > 0
                        ? `~$${oppTotal.toLocaleString()} in queue`
                        : "Impact TBD"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">If ignored</dt>
                  <dd className="mt-1 text-sm text-amber-200/90">
                    {next.costOfIgnore?.estimatedRevenueLoss != null &&
                    next.costOfIgnore.estimatedRevenueLoss > 0
                      ? `−$${next.costOfIgnore.estimatedRevenueLoss.toLocaleString()}`
                      : ignoreCost > 0
                        ? `~$${Math.round(ignoreCost).toLocaleString()} at risk`
                        : "Opportunity cost rises as leads go cold"}
                    {next.costOfIgnore?.estimatedTimeLoss ? (
                      <span className="mt-1 block text-[0.65rem] text-muted">
                        {next.costOfIgnore.estimatedTimeLoss}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Confidence</dt>
                  <dd className="mt-1 font-display text-xl text-cream">
                    {Math.round(next.confidence * 100)}%
                    {confidence ? (
                      <span className="ml-2 text-xs font-sans tracking-normal text-muted uppercase">
                        · OS {confidence.band}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ExecuteButton
                  target={{
                    id: next.id,
                    title: next.title,
                    href: next.href,
                    actionLabel: next.actionLabel,
                    kind: next.executeKind,
                    evidence: next.evidence,
                    confidence: next.confidence,
                    expectedRevenue: next.estimatedRevenue,
                    expectedOutcome: next.expectedOutcome,
                  }}
                />
                <Link href="/admin/opportunities" className="text-xs text-accent hover:underline">
                  All opportunities →
                </Link>
                <Link href="/admin/briefing" className="text-xs text-muted hover:text-accent hover:underline">
                  Full briefing →
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-3">
              <h2 className="font-display text-2xl text-cream">No urgent priority</h2>
              <p className="mt-2 max-w-xl text-sm text-fog">
                Business Brain has nothing ranked above the fold. Review risks, leaks, or refresh intelligence.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Link href="/admin/risks" className="text-accent hover:underline">
                  Risks →
                </Link>
                <Link href="/admin/leaks" className="text-accent hover:underline">
                  Leaks →
                </Link>
                <Link href="/admin/memory" className="text-accent hover:underline">
                  Business Brain →
                </Link>
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {health && (
            <div className="rounded-xl border border-stone/20 bg-charcoal/20 p-4" title={health.overall.note}>
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">Business health</p>
              <p className="mt-1 font-display text-3xl text-cream">{health.overall.score}</p>
              <p className="mt-1 text-[0.65rem] capitalize text-fog">{health.overall.label}</p>
            </div>
          )}
          {tm?.["revenue.mtd"] ? (
            <TruthMetricCard metric={tm["revenue.mtd"]} href="/admin/payments" currency />
          ) : (
            <AdminMetricCard
              label="Revenue MTD"
              value={formatCurrency(briefing?.month.revenue ?? metrics.revenue.value)}
              href="/admin/payments"
            />
          )}
          {executive ? (
            <AdminMetricCard
              label="Forecast"
              value={formatCurrency(executive.projectedMonthlyRevenue)}
              hint="Estimated trajectory"
              href="/admin/pipeline"
            />
          ) : confidence ? (
            <div className="rounded-xl border border-stone/20 bg-charcoal/20 p-4">
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">AI confidence</p>
              <p className="mt-1 font-display text-3xl text-cream">{confidence.composite}</p>
              <p className="mt-1 text-[0.65rem] uppercase text-fog">{confidence.band}</p>
            </div>
          ) : null}
          {leaks && leaks.count > 0 ? (
            <Link
              href="/admin/leaks"
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:border-amber-500/50"
            >
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">Biggest risk · $</p>
              <p className="mt-1 font-display text-3xl text-amber-300">~${leaks.loss.toLocaleString()}</p>
              <p className="mt-1 text-[0.65rem] text-fog">{leaks.count} leaks →</p>
            </Link>
          ) : sharedRisks[0] ? (
            <Link
              href={sharedRisks[0].href}
              className="rounded-xl border border-stone/20 bg-charcoal/20 p-4 transition-colors hover:border-accent/40"
            >
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">Biggest risk</p>
              <p className="mt-2 line-clamp-2 text-sm text-cream">{sharedRisks[0].title}</p>
            </Link>
          ) : (
            <div className="rounded-xl border border-stone/20 bg-charcoal/20 p-4">
              <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">Risk posture</p>
              <p className="mt-2 text-sm text-fog">Clear — no elevated signals</p>
            </div>
          )}
        </div>

        <AIDailyBriefingPanel compact />

        {tm?.["revenue.mtd"] && tm["revenue.mtd"].label !== "verified" && (
          <div className="rounded-xl border border-stone/20 bg-charcoal/20 px-4 py-3 text-sm text-fog">
            Revenue MTD is <span className="text-cream">Estimated</span> from pipeline —{" "}
            <Link href="/admin/qa" className="text-accent hover:underline">
              connect Stripe for Verified
            </Link>
            .
          </div>
        )}

        {health && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ["Overall", health.overall],
                ["Sales", health.sales],
                ["Finance", health.finance],
                ["Website", health.website],
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

        {(confidence || (leaks && leaks.count > 0)) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {confidence && (
              <div className="rounded-xl border border-stone/20 bg-charcoal/20 p-4">
                <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">
                  Confidence · {confidence.band}
                </p>
                <p className="mt-1 font-display text-3xl text-cream">{confidence.composite}</p>
                <ul className="mt-3 space-y-1 text-[0.65rem] text-fog">
                  {confidence.factors.slice(0, 4).map((f) => (
                    <li key={f.id}>
                      {f.label}: {f.score}
                    </li>
                  ))}
                </ul>
                {confidence.blockers.length > 0 && (
                  <p className="mt-2 text-[0.65rem] text-amber-300">
                    Blocked by: {confidence.blockers.join("; ")}
                  </p>
                )}
              </div>
            )}
            {leaks && leaks.count > 0 && (
              <Link
                href="/admin/leaks"
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:border-amber-500/50"
              >
                <p className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">Revenue leaks</p>
                <p className="mt-1 font-display text-3xl text-amber-300">
                  ~${leaks.loss.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-fog">
                  {leaks.count} leak{leaks.count === 1 ? "" : "s"} · recover ~$
                  {leaks.recoverable.toLocaleString()} →
                </p>
              </Link>
            )}
          </div>
        )}

        {(sharedRecs.length > 0 || sharedRisks.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <OpportunityRevenueBanner total={oppTotal} count={sharedRecs.length} />
              {sharedRecs.slice(0, 3).map((r) => (
                <div key={r.id} className="os-panel rounded-xl border border-stone/20 p-4">
                  <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                    {r.priority} · {r.category}
                  </p>
                  <p className="mt-1 font-display text-base text-cream">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fog">{r.why}</p>
                  <p className="mt-2 text-[0.65rem] text-amber-200/80">
                    Ignore −$
                    {(r.costOfIgnore?.estimatedRevenueLoss ?? Math.round(r.estimatedRevenue * 0.7)).toLocaleString()}
                    {" · "}
                    {r.evidence.length} evidence
                    {r.decisionStatus && r.decisionStatus !== "pending"
                      ? ` · Decision ${r.decisionStatus}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.65rem] text-emerald-400/90">
                      {r.estimatedRevenue > 0 ? `+$${r.estimatedRevenue.toLocaleString()}` : "Impact TBD"} ·{" "}
                      {Math.round(r.confidence * 100)}% · ~{r.timeMinutes} min
                    </p>
                    <ExecuteButton
                      target={{
                        id: r.id,
                        title: r.title,
                        href: r.href,
                        actionLabel: r.actionLabel,
                        kind: r.executeKind,
                        evidence: r.evidence,
                        confidence: r.confidence,
                        expectedRevenue: r.estimatedRevenue,
                        expectedOutcome: r.expectedOutcome,
                      }}
                    />
                  </div>
                </div>
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
    </WorkspaceChrome>
  );
}
