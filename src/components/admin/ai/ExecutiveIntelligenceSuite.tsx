"use client";

import Link from "next/link";
import type { IntelligenceSuite, PrioritizedRecommendation } from "@/lib/ai/types";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "text-red-400 border-red-500/30",
    high: "text-amber-300 border-amber-500/30",
    medium: "text-accent border-accent/30",
    low: "text-muted border-stone/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[0.55rem] uppercase ${colors[priority] ?? colors.medium}`}>
      {priority}
    </span>
  );
}

function RecCard({ rec }: { rec: PrioritizedRecommendation }) {
  return (
    <div className="rounded-lg border border-stone/20 bg-charcoal/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-cream">{rec.title}</p>
        <PriorityBadge priority={rec.priority} />
      </div>
      <p className="mt-1 text-xs text-fog">{rec.detail}</p>
      <p className="mt-2 text-xs text-muted">
        ~${rec.estimatedRevenue.toLocaleString()} · {Math.round(rec.confidence * 100)}% conf · {rec.timeToCompleteMinutes}m ·{" "}
        {rec.difficulty}
      </p>
      <p className="mt-1 text-xs text-accent">{rec.whyNow}</p>
      <BusinessActionBar actions={rec.actions} compact className="mt-2" />
    </div>
  );
}

export function ExecutiveIntelligenceSuite({ suite }: { suite: IntelligenceSuite }) {
  const morning = suite.executiveMorning;
  const funnel = suite.revenueAttribution;

  return (
    <div className="space-y-8">
      <section className="os-glass rounded-2xl border border-accent/25 p-6">
        <p className="label-caps text-accent">Daily Executive Briefing</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[0.6rem] uppercase text-emerald-400">Biggest win</p>
            <p className="mt-1 text-sm text-cream">{morning.biggestWin}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase text-red-400">Biggest revenue leak</p>
            <p className="mt-1 text-sm text-cream">{morning.biggestRevenueLeak}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase text-accent">Biggest opportunity</p>
            <p className="mt-1 text-sm text-cream">{morning.biggestOpportunity}</p>
          </div>
          {morning.highestRoiRecommendation && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-[0.6rem] uppercase text-emerald-400">Highest ROI today</p>
              <p className="mt-1 text-sm text-cream">{morning.highestRoiRecommendation.title}</p>
              <p className="mt-1 text-xs text-fog">
                ~${morning.highestRoiRecommendation.estimatedRevenue.toLocaleString()} ·{" "}
                {morning.highestRoiRecommendation.whyNow}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-[0.6rem] uppercase text-muted">Three actions for today</p>
          <ul className="mt-2 space-y-1">
            {morning.actionsToday.map((a) => (
              <li key={a.title}>
                <Link href={a.href} className="text-sm text-accent hover:underline">
                  {a.title}
                </Link>
                <span className="ml-2 text-xs text-muted">~${a.revenueImpact.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        {morning.risksToWatch.length > 0 && (
          <div className="mt-4">
            <p className="text-[0.6rem] uppercase text-amber-300">Risks to watch</p>
            <ul className="mt-1 space-y-1 text-xs text-fog">
              {morning.risksToWatch.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <AdminPanel
        title="Revenue attribution funnel"
        subtitle={`~$${funnel.totalRecoverable.toLocaleString()} recoverable · ${funnel.periodDays}d`}
      >
        <div className="space-y-2">
          {funnel.steps.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone/15 px-3 py-2 text-xs">
              <span className="text-cream">{s.label}</span>
              <span className="text-fog">{s.count.toLocaleString()}</span>
              <span className="text-muted">{s.conversionFromPrevious}% →</span>
              {s.dropOffRate > 10 && (
                <span className="text-red-400">-{s.dropOffRate}% · ~${s.estimatedRevenueLost.toLocaleString()} lost</span>
              )}
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Prioritized recommendations" subtitle="Revenue · confidence · time · difficulty">
        <div className="grid gap-3 lg:grid-cols-2">
          {suite.prioritizedRecommendations.slice(0, 6).map((r) => (
            <RecCard key={r.id} rec={r} />
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Website heat intelligence" subtitle="What converts vs what gets ignored">
          <p className="mb-2 text-xs text-muted">Top converters</p>
          <ul className="space-y-1 text-xs text-fog">
            {suite.websiteHeat.topConverters.slice(0, 4).map((s) => (
              <li key={s.path}>
                {s.label}: {s.views} views · {s.conversionRate}% conv — {s.insight}
              </li>
            ))}
          </ul>
          {suite.websiteHeat.weakCtas.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-xs text-muted">Weak CTAs</p>
              <ul className="space-y-1 text-xs text-red-300">
                {suite.websiteHeat.weakCtas.slice(0, 3).map((w) => (
                  <li key={w.path}>
                    {w.path}: {w.issue}
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>

        <AdminPanel title="Booking intelligence" subtitle={`${suite.booking.bookingRate}% close rate`}>
          <p className="text-xs text-fog">
            Avg response: {suite.booking.avgResponseTimeHours}h · Inquiry→booking:{" "}
            {suite.booking.avgInquiryToBookingDays}d
          </p>
          <ul className="mt-2 space-y-1 text-xs text-fog">
            {suite.booking.bySource.slice(0, 4).map((s) => (
              <li key={s.source}>
                {s.source}: {s.bookingRate}% · ${s.revenue.toLocaleString()}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel title="Predictive intelligence" subtitle="Forward-looking with recovery actions">
        <div className="space-y-3">
          {suite.predictive.slice(0, 3).map((p) => (
            <div key={p.id} className="rounded-lg border border-stone/15 p-3">
              <p className="text-sm text-cream">{p.prediction}</p>
              <p className="mt-1 text-xs text-accent">{p.recoveryAction}</p>
              <p className="mt-1 text-xs text-muted">
                {p.recoveryImpact} · ~${p.estimatedRevenue.toLocaleString()} · {Math.round(p.confidence * 100)}% conf
              </p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Financial intelligence" subtitle={`${suite.financial.monthlyGrowthRate >= 0 ? "+" : ""}${suite.financial.monthlyGrowthRate}% growth`}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted">Gross revenue</p>
              <p className="text-cream">${suite.financial.grossRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted">Net profit (est.)</p>
              <p className="text-cream">${suite.financial.netProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted">APV</p>
              <p className="text-cream">${suite.financial.averageProjectValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted">Rev/visitor</p>
              <p className="text-cream">${suite.financial.revenuePerVisitor}</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Executive memory" subtitle="Proven wins · avoid repeats">
          <ul className="space-y-1 text-xs text-fog">
            {suite.executiveMemory.provenWins.slice(0, 3).map((w) => (
              <li key={w} className="text-emerald-300">• {w}</li>
            ))}
            {suite.executiveMemory.avoidSuggestions.slice(0, 2).map((a) => (
              <li key={a} className="text-amber-300">• {a}</li>
            ))}
          </ul>
          <Link href="/admin/memory" className="mt-2 inline-block text-xs text-accent hover:underline">
            Knowledge Engine →
          </Link>
        </AdminPanel>
      </div>
    </div>
  );
}
