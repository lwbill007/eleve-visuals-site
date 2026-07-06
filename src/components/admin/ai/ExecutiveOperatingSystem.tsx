"use client";

import Link from "next/link";
import { useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { ExecutiveOperatingSystem, ExecutiveMission, ExplainableHealthDomain } from "@/lib/ai/executive/operating-system-types";
import type { DataQualityLabel } from "@/lib/ai/executive/data-quality";
import { QUALITY_LABELS } from "@/lib/ai/executive/data-quality";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";
import { cn } from "@/lib/utils";

const QUALITY_STYLES: Record<DataQualityLabel, string> = {
  verified: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  estimated: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  predicted: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  calculated: "text-accent border-accent/30 bg-accent/10",
  incomplete: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  unavailable: "text-muted border-stone/30 bg-stone/10",
};

function QualityBadge({ quality, freshness }: { quality: DataQualityLabel; freshness?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={cn("rounded-full border px-2 py-0.5 text-[0.55rem] uppercase", QUALITY_STYLES[quality])}>
        {QUALITY_LABELS[quality]}
      </span>
      {freshness && <span className="text-[0.6rem] text-muted">{freshness}</span>}
    </span>
  );
}

function WorkflowSection({
  step,
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="relative border-l-2 border-accent/20 pl-6 pb-10 ml-3">
      <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.5rem] font-bold text-ink">
        {step}
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
        <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">Step {step}</p>
        <h3 className="font-display text-lg text-cream">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-fog">{subtitle}</p>}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function MissionCard({
  mission,
  highlight,
  onComplete,
}: {
  mission: ExecutiveMission;
  highlight?: boolean;
  onComplete?: () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(mission.completed);

  async function markComplete(worked: boolean) {
    setCompleting(true);
    try {
      await adminFetch("/api/admin/ai/mission/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: mission.id,
          title: mission.title,
          worked,
          revenueImpact: mission.expectedRevenue.value,
        }),
      });
      setDone(true);
      onComplete?.();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        highlight ? "border-accent/40 bg-accent/5" : "border-stone/20 bg-charcoal/10",
        done && "opacity-60"
      )}
    >
      {highlight && <p className="text-[0.55rem] tracking-[0.2em] text-accent uppercase mb-2">The One Thing</p>}
      <h4 className="text-lg font-medium text-cream">{mission.title}</h4>
      <p className="mt-2 text-sm text-fog">{mission.reasoning}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-xs">
        <div>
          <p className="text-muted">Expected revenue</p>
          <p className="text-cream">${mission.expectedRevenue.value.toLocaleString()}</p>
          <QualityBadge quality={mission.expectedRevenue.quality} freshness={mission.expectedRevenue.freshness} />
        </div>
        <div>
          <p className="text-muted">Expected bookings</p>
          <p className="text-cream">+{mission.expectedBookings.value}</p>
          <QualityBadge quality={mission.expectedBookings.quality} freshness={mission.expectedBookings.freshness} />
        </div>
        <div>
          <p className="text-muted">Time · Difficulty · Confidence</p>
          <p className="text-cream">
            {mission.timeMinutes}m · {mission.difficulty} · {Math.round(mission.confidence * 100)}%
          </p>
        </div>
        <div>
          <p className="text-muted">Success metric</p>
          <p className="text-cream">{mission.successMetric}</p>
        </div>
      </div>

      {mission.evidence.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.6rem] uppercase text-muted">Evidence</p>
          <ul className="mt-1 space-y-0.5 text-xs text-fog">
            {mission.evidence.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={mission.href}
          className="rounded-lg bg-cream px-4 py-2 text-xs text-ink uppercase hover:bg-accent"
        >
          Start mission
        </Link>
        {!done && (
          <>
            <button
              type="button"
              disabled={completing}
              onClick={() => markComplete(true)}
              className="rounded-lg border border-emerald-500/40 px-4 py-2 text-xs text-emerald-400 uppercase hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {completing ? "…" : "Complete — it worked"}
            </button>
            <button
              type="button"
              disabled={completing}
              onClick={() => markComplete(false)}
              className="rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-stone/50 disabled:opacity-50"
            >
              Complete — no lift
            </button>
          </>
        )}
        {done && <span className="text-xs text-emerald-400">Logged — AI will learn from this outcome</span>}
      </div>
      <BusinessActionBar actions={mission.actions} compact className="mt-3" />
    </div>
  );
}

function HealthDomainCard({ domain }: { domain: ExplainableHealthDomain }) {
  const [open, setOpen] = useState(false);
  const score = domain.score.value;
  const color = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-300" : "text-red-400";

  return (
    <div className="rounded-lg border border-stone/20 p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="text-sm text-cream">{domain.label}</p>
          <QualityBadge quality={domain.score.quality} freshness={domain.score.freshness} />
        </div>
        <p className={cn("font-display text-2xl", color)}>{score}</p>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-stone/15 pt-3 text-xs text-fog">
          <p>
            30d: {domain.trend30 >= 0 ? "+" : ""}
            {domain.trend30}% · 90d: {domain.trend90 >= 0 ? "+" : ""}
            {domain.trend90}% · Avg: {domain.historicalAvg}
          </p>
          <p>{domain.whyChanged}</p>
          {domain.improved.length > 0 && (
            <p className="text-emerald-400">↑ {domain.improved.join(" · ")}</p>
          )}
          {domain.declined.length > 0 && <p className="text-red-400">↓ {domain.declined.join(" · ")}</p>}
          {domain.topActions.map((a) => (
            <Link key={a.title} href={a.href} className="block rounded border border-accent/20 p-2 hover:border-accent/40">
              <p className="text-cream">{a.title}</p>
              <p className="text-muted">
                +${a.revenueGain.toLocaleString()} · {a.minutes}m — {a.why}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueJourneyTree({ node, depth = 0 }: { node: ExecutiveOperatingSystem["revenueJourney"]; depth?: number }) {
  return (
    <div className={cn("text-xs", depth > 0 && "ml-4 mt-2 border-l border-stone/20 pl-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-cream">{node.label}</span>
        <span className="text-fog">{node.value}</span>
        <QualityBadge quality={node.quality} />
      </div>
      {node.children?.map((c) => <RevenueJourneyTree key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export function ExecutiveOperatingSystemView({
  os,
  onRefresh,
}: {
  os: ExecutiveOperatingSystem;
  onRefresh?: () => void;
}) {
  let step = 0;
  const next = () => ++step;

  const freshness = new Date(os.generatedAt).toLocaleString();

  return (
    <div className="max-w-4xl">
      <p className="mb-8 text-xs text-muted">
        Operating system snapshot · {freshness} · Every metric labeled Verified, Estimated, Predicted, Calculated, Incomplete, or Unavailable
      </p>
      <WorkflowSection step={next()} title="Mission Control" subtitle="The single highest-impact action today">
        <MissionCard mission={os.theOneThing} highlight onComplete={onRefresh} />
      </WorkflowSection>

      <WorkflowSection step={next()} title="Morning Briefing" subtitle="How the business changed since yesterday">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-[0.55rem] uppercase text-emerald-400">Biggest win</p>
            <p className="mt-1 text-sm text-cream">{os.morningBriefing.biggestWin}</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-[0.55rem] uppercase text-red-400">Biggest leak</p>
            <p className="mt-1 text-sm text-cream">{os.morningBriefing.biggestLeak}</p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
            <p className="text-[0.55rem] uppercase text-accent">Top opportunity</p>
            <p className="mt-1 text-sm text-cream">{os.morningBriefing.biggestOpportunity}</p>
          </div>
          <div className="rounded-lg border border-stone/20 p-3">
            <p className="text-[0.55rem] uppercase text-muted">AI learned</p>
            <p className="mt-1 text-sm text-cream">{os.morningBriefing.whatAiLearned}</p>
          </div>
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Business Health" subtitle="Every score is explainable — tap to expand" defaultOpen={false}>
        <div className="grid gap-2 sm:grid-cols-2">
          {os.healthDomains.map((d) => (
            <HealthDomainCard key={d.id} domain={d} />
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Highest ROI Opportunity" defaultOpen={false}>
        {os.highestRoiOpportunity ? (
          <div className="rounded-lg border border-emerald-500/20 p-4">
            <p className="text-cream">{os.highestRoiOpportunity.title}</p>
            <p className="mt-1 text-sm text-fog">{os.highestRoiOpportunity.why}</p>
            <p className="mt-2 text-xs text-muted">
              ~${os.highestRoiOpportunity.expectedRevenue.toLocaleString()} · {Math.round(os.highestRoiOpportunity.confidence * 100)}% conf
            </p>
            <BusinessActionBar actions={os.highestRoiOpportunity.actions} compact className="mt-2" />
          </div>
        ) : (
          <p className="text-sm text-fog">No ranked opportunities — run Intelligence Refresh.</p>
        )}
      </WorkflowSection>

      <WorkflowSection step={next()} title="Highest Risk" defaultOpen={false}>
        {os.highestRisk ? (
          <div className="rounded-lg border border-red-500/20 p-4">
            <p className="text-cream">{os.highestRisk.title}</p>
            <p className="mt-1 text-sm text-fog">{os.highestRisk.detail}</p>
            <p className="mt-2 text-xs text-muted">Why: {os.highestRisk.why}</p>
          </div>
        ) : (
          <p className="text-sm text-fog">No elevated risks.</p>
        )}
      </WorkflowSection>

      <WorkflowSection
        step={next()}
        title="Critical Notifications"
        subtitle={os.criticalNotifications.length === 0 ? "Nothing urgent" : undefined}
        defaultOpen={os.criticalNotifications.length > 0}
      >
        {os.criticalNotifications.length > 0 ? (
          <ul className="space-y-2">
            {os.criticalNotifications.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="block rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 hover:border-accent/40">
                  <p className="text-sm text-cream">{n.title}</p>
                  <p className="text-xs text-fog">{n.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog">No critical notifications — focus on missions.</p>
        )}
      </WorkflowSection>

      <WorkflowSection step={next()} title="Today&apos;s Missions" subtitle="Ranked by expected ROI">
        <div className="space-y-4">
          {os.todaysMissions.slice(1).map((m) => (
            <MissionCard key={m.id} mission={m} onComplete={onRefresh} />
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Revenue Intelligence" subtitle="Trace every dollar" defaultOpen={false}>
        <RevenueJourneyTree node={os.revenueJourney} />
        <p className="mt-3 text-xs text-muted">
          Potential pipeline: ${os.salesIntelligence.potentialRevenue.value.toLocaleString()}{" "}
          <QualityBadge
            quality={os.salesIntelligence.potentialRevenue.quality}
            freshness={os.salesIntelligence.potentialRevenue.freshness}
          />
        </p>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Marketing Intelligence" defaultOpen={false}>
        <p className="text-sm font-medium text-cream">{os.marketingIntelligence.recommendation}</p>
        <p className="mt-1 text-sm text-fog">{os.marketingIntelligence.why}</p>
        <p className="mt-2 text-xs text-muted">{os.marketingIntelligence.historicalComparison}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span>
            Reach: {os.marketingIntelligence.expectedReach.value}{" "}
            <QualityBadge quality={os.marketingIntelligence.expectedReach.quality} />
          </span>
          <span>
            Est. bookings: {os.marketingIntelligence.expectedBookings.value}{" "}
            <QualityBadge quality={os.marketingIntelligence.expectedBookings.quality} />
          </span>
          <span>
            Est. revenue: ${os.marketingIntelligence.expectedRevenue.value.toLocaleString()}
          </span>
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Sales Intelligence" defaultOpen={false}>
        <div className="space-y-2 text-sm">
          <p className="text-cream">
            Potential revenue available: ${os.salesIntelligence.potentialRevenue.value.toLocaleString()}
          </p>
          <p className="text-fog">
            Lost revenue (stale): ${os.salesIntelligence.lostRevenue.value.toLocaleString()} · {os.salesIntelligence.missedFollowUps} missed follow-ups
          </p>
          {os.salesIntelligence.highestValueClientToday && (
            <p className="text-accent">
              Highest value client today: {os.salesIntelligence.highestValueClientToday.name} —{" "}
              {os.salesIntelligence.highestValueClientToday.action}
            </p>
          )}
          <ul className="text-xs text-fog">
            {os.salesIntelligence.recommendedConversations.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Website Intelligence" defaultOpen={false}>
        <div className="space-y-3">
          {os.websiteIntelligence.slice(0, 4).map((p) => (
            <div key={p.path} className="rounded border border-stone/15 p-3 text-xs">
              <p className="text-cream">{p.label}</p>
              <p className="mt-1 text-fog">
                Traffic {p.trafficScore} · Conv {p.conversionScore} · Revenue {p.revenueScore} · UX {p.uxScore}
              </p>
              <p className="mt-1 text-muted">{p.explanation}</p>
            </div>
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Client Intelligence" defaultOpen={false}>
        <div className="space-y-2">
          {os.clientIntelligence.slice(0, 5).map((c) => (
            <Link key={c.email} href={c.href} className="block rounded border border-stone/15 p-3 text-xs hover:border-accent/30">
              <p className="text-cream">{c.name}</p>
              <p className="text-fog">
                VIP {c.vipScore} · LTV ${c.ltv.toLocaleString()} · Churn risk {c.churnRisk}%
              </p>
              <p className="text-accent">{c.nextBestAction}</p>
            </Link>
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Executive Memory" subtitle="Institutional knowledge — not vanity learnings" defaultOpen={false}>
        <ul className="space-y-3">
          {os.institutionalMemory.map((m) => (
            <li key={m.id} className="rounded-lg border border-stone/15 p-3 text-xs">
              <p className="text-sm text-cream">{m.lesson}</p>
              <p className="mt-1 text-fog">Impact: {m.businessImpact}</p>
              <p className="mt-1 text-muted">
                {m.status} · {Math.round(m.confidence * 100)}% conf · {new Date(m.learnedAt).toLocaleDateString()} · ref×{m.timesReferenced}
              </p>
            </li>
          ))}
        </ul>
      </WorkflowSection>

      <WorkflowSection step={next()} title="Predictions" defaultOpen={false}>
        <div className="grid gap-3 sm:grid-cols-2">
          {os.predictions.slice(0, 4).map((f) => (
            <div key={f.metric} className="rounded border border-stone/15 p-3 text-xs">
              <p className="text-cream">{f.label}</p>
              <p className="mt-1 text-fog">{f.why}</p>
              <p className="mt-1 text-muted">
                {f.confidenceInterval} · {Math.round(f.confidence * 100)}% conf
              </p>
              <p className="mt-1 text-accent">{f.howToImprove}</p>
            </div>
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection step={next()} title="AI Decisions" defaultOpen={false}>
        <div className="space-y-3">
          {os.aiDecisions.map((d) => (
            <div key={d.id} className="rounded border border-stone/15 p-3 text-xs">
              <p className="text-sm text-cream">{d.title}</p>
              <p className="mt-1 text-fog">{d.why}</p>
              <p className="mt-1 text-muted">
                ~${d.revenueImpact.toLocaleString()} · {Math.round(d.confidence * 100)}% · Risk: {d.downside}
              </p>
              <Link href={d.href} className="mt-2 inline-block text-accent hover:underline">
                Take action →
              </Link>
            </div>
          ))}
        </div>
      </WorkflowSection>
    </div>
  );
}
