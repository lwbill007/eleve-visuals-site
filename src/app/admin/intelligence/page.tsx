"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  DecisionCard,
  ExecutionDraftCard,
  ExecutiveScoreGrid,
  ForecastCard,
  OpportunityCard,
  OpportunityRevenueBanner,
  RiskCard,
  TimelineEvent,
  TransparencyPanel,
} from "@/components/admin/os/ExecutiveIntelligenceComponents";
import type { ExecutiveIntelligence } from "@/lib/ai/types";
import Link from "next/link";

export default function ExecutiveIntelligencePage() {
  useSetAIPage("intelligence");
  const [data, setData] = useState<ExecutiveIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (refresh = false) => {
    setLoading(true);
    adminFetch(`/api/admin/ai/executive${refresh ? "?refresh=1" : ""}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell title="Executive Intelligence">
      <AdminPageHeader
        eyebrow="Chief Strategy Officer"
        title="Executive Intelligence"
        description="Proactive business decisions backed by evidence — not chatbot answers. Every score, risk, and opportunity explains why."
        action={
          <button
            type="button"
            onClick={() => load(true)}
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-accent"
          >
            Refresh intelligence
          </button>
        }
      />

      <div className="mb-8">
        <AIDailyBriefingPanel />
      </div>

      {loading && !data ? (
        <p className="text-fog">Loading executive intelligence…</p>
      ) : data ? (
        <div className="space-y-8">
          <section>
            <h3 className="mb-4 font-display text-xl text-cream">Business health</h3>
            <ExecutiveScoreGrid scores={data.scores} />
          </section>

          <OpportunityRevenueBanner total={data.totalOpportunityRevenue} count={data.opportunities.length} />

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Opportunity engine" subtitle="Highest ROI actions">
              <div className="space-y-3">
                {data.opportunities.slice(0, 4).map((o) => (
                  <OpportunityCard key={o.id} opp={o} />
                ))}
              </div>
              <Link href="/admin/opportunities" className="mt-4 inline-block text-xs text-accent hover:underline">
                View all opportunities →
              </Link>
            </AdminPanel>

            <AdminPanel title="Risk center" subtitle="Warnings before problems compound">
              <div className="space-y-3">
                {data.risks.slice(0, 4).map((r) => (
                  <RiskCard key={r.id} risk={r} />
                ))}
                {data.risks.length === 0 && (
                  <p className="text-sm text-fog">No elevated risks from current signals.</p>
                )}
              </div>
              <Link href="/admin/risks" className="mt-4 inline-block text-xs text-accent hover:underline">
                Risk Center →
              </Link>
            </AdminPanel>
          </div>

          <AdminPanel title="Decision center" subtitle="Evidence-backed recommendations">
            <div className="grid gap-3 lg:grid-cols-2">
              {data.decisions.slice(0, 4).map((d) => (
                <DecisionCard key={d.id} decision={d} />
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Forecasts" subtitle="Predictions with confidence intervals">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.forecasts.map((f) => (
                <ForecastCard key={f.metric} forecast={f} />
              ))}
            </div>
          </AdminPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Business timeline" subtitle="Verified learnings & milestones">
              {data.timeline.map((e) => (
                <TimelineEvent key={e.id} event={e} />
              ))}
              <Link href="/admin/memory" className="mt-4 inline-block text-xs text-accent hover:underline">
                Memory Center & knowledge graph →
              </Link>
            </AdminPanel>

            <AdminPanel title="Execution mode" subtitle="Drafts prepared for your approval — nothing sends automatically">
              <div className="space-y-3">
                {data.executionDrafts.map((d) => (
                  <ExecutionDraftCard key={d.id} draft={d} />
                ))}
              </div>
            </AdminPanel>
          </div>

          <TransparencyPanel {...data.transparency} />
        </div>
      ) : null}
    </AdminShell>
  );
}
