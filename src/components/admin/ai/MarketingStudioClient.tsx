"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AIGeneratePanel } from "./AIGeneratePanel";
import { AskAIButton } from "./AskAIPanel";
import { BusinessActionBar } from "./BusinessActionBar";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { adminFetch } from "@/lib/admin-fetch";
import type { MarketingRecommendation } from "@/lib/ai/types";
import type { CMOIntelligence } from "@/lib/ai/marketing/types";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { task: "instagram_caption" as const, label: "Instagram Caption", prompt: "Write an Instagram caption for a new cinematic portrait gallery." },
  { task: "instagram_story" as const, label: "Story Sequence", prompt: "Write a 3-slide Instagram Story sequence for a new portfolio drop." },
  { task: "email_body" as const, label: "Email Campaign", prompt: "Write a luxury email campaign announcing new work." },
  { task: "blog_post" as const, label: "Blog Post", prompt: "Write a blog post about the ÉLEVÉ creative process." },
  { task: "seo_meta" as const, label: "SEO Metadata", prompt: "Write SEO title and meta description for the portfolio page." },
  { task: "pinterest_pin" as const, label: "Pinterest Pin", prompt: "Write Pinterest pin title and description for editorial portraits." },
  { task: "tiktok_caption" as const, label: "TikTok Caption", prompt: "Write a TikTok caption for behind-the-scenes session content." },
  { task: "facebook_post" as const, label: "Facebook Post", prompt: "Write a Facebook post announcing a new gallery." },
  { task: "newsletter" as const, label: "Newsletter", prompt: "Write a full newsletter for ÉLEVÉ subscribers." },
  { task: "launch_campaign" as const, label: "Launch Campaign", prompt: "Write a Vol. 2 ÉLEVÉ Sessions launch campaign across channels." },
  { task: "threads_post" as const, label: "Threads", prompt: "Write a Threads post about upcoming sessions." },
  { task: "campaign" as const, label: "Re-engagement", prompt: "Write a re-engagement campaign for inactive clients." },
  { task: "follow_up" as const, label: "Follow-Up Email", prompt: "Write a personal follow-up email for booking inquiries awaiting a response." },
  { task: "session_email" as const, label: "Sessions Email", prompt: "Write a warm ÉLEVÉ Sessions acceptance or promotion email." },
];

export function MarketingStudioClient() {
  useSetAIPage("marketing");
  const searchParams = useSearchParams();
  const focusTask = searchParams.get("focus") || searchParams.get("task");
  const focusPrompt = searchParams.get("prompt");
  const [recommendations, setRecommendations] = useState<MarketingRecommendation[]>([]);
  const [cmo, setCmo] = useState<CMOIntelligence | null>(null);
  const [loadingCmo, setLoadingCmo] = useState(true);
  const [activeTab, setActiveTab] = useState<"command" | "create" | "campaigns" | "learn">("command");
  const initialIndex = focusTask ? CHANNELS.findIndex((c) => c.task === focusTask) : 0;
  const [active, setActive] = useState(initialIndex >= 0 ? initialIndex : 0);
  const channel = CHANNELS[active];

  useEffect(() => {
    adminFetch("/api/admin/ai/operator")
      .then((r) => r.json())
      .then((d) => setRecommendations(d.marketing ?? []));
  }, []);

  useEffect(() => {
    setLoadingCmo(true);
    adminFetch("/api/admin/ai/marketing/intelligence")
      .then((r) => r.json())
      .then((d) => setCmo(d))
      .finally(() => setLoadingCmo(false));
  }, []);

  useEffect(() => {
    if (focusTask) {
      const idx = CHANNELS.findIndex((c) => c.task === focusTask);
      if (idx >= 0) {
        setActive(idx);
        setActiveTab("create");
      }
    }
  }, [focusTask]);

  async function refreshCMO() {
    setLoadingCmo(true);
    const res = await adminFetch("/api/admin/ai/marketing/intelligence?refresh=1");
    if (res.ok) setCmo(await res.json());
    setLoadingCmo(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Chief Marketing Officer"
          title="Marketing Intelligence"
          description="ÉLEVÉ AI thinks, plans, tests, learns, and remembers — every campaign becomes institutional knowledge. Not a content bot. A CMO with perfect memory."
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loadingCmo}
            onClick={() => void refreshCMO()}
            className="rounded-xl bg-cream px-5 py-3 text-xs tracking-[0.12em] text-ink uppercase hover:bg-accent disabled:opacity-50"
          >
            {loadingCmo ? "Analyzing…" : "Refresh CMO Intel"}
          </button>
          <AskAIButton />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone/20 pb-4">
        {(
          [
            ["command", "Command Center"],
            ["create", "Create"],
            ["campaigns", "Campaign Memory"],
            ["learn", "Learning & Tests"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs tracking-[0.1em] uppercase transition-colors",
              activeTab === id ? "border-accent bg-accent/10 text-accent" : "border-stone/25 text-muted hover:text-cream"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "command" && (
        <CMOCommandCenter cmo={cmo} loading={loadingCmo} recommendations={recommendations} />
      )}

      {activeTab === "create" && (
        <>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c, i) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  i === active ? "border-accent bg-accent/10 text-cream" : "border-stone/30 text-fog hover:border-accent/40"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <AdminPanel title={channel.label} subtitle="Generate draft — auto-saved as campaign case study">
            <AIGeneratePanel
              key={channel.label}
              task={channel.task}
              label={channel.label}
              prompt={focusPrompt || channel.prompt}
              buttonLabel={`Generate ${channel.label}`}
            />
          </AdminPanel>
        </>
      )}

      {activeTab === "campaigns" && <CampaignMemoryPanel cmo={cmo} />}
      {activeTab === "learn" && <LearningPanel cmo={cmo} />}
    </div>
  );
}

function CMOCommandCenter({
  cmo,
  loading,
  recommendations,
}: {
  cmo: CMOIntelligence | null;
  loading: boolean;
  recommendations: MarketingRecommendation[];
}) {
  if (loading && !cmo) {
    return <div className="h-48 animate-pulse rounded-2xl bg-stone/10" />;
  }
  if (!cmo) return <p className="text-sm text-muted">CMO intelligence unavailable.</p>;

  const { briefing, brand, revenueAttribution, predictions, transparency } = cmo;

  return (
    <div className="space-y-6">
      <section className="os-glass rounded-2xl border border-accent/25 p-6">
        <p className="label-caps text-accent">Daily executive briefing</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {briefing.scores.map((s) => (
            <div key={s.key} className="os-panel rounded-xl p-3 text-center">
              <p className="font-display text-2xl text-cream">{s.value}</p>
              <p className="mt-1 text-[0.55rem] tracking-[0.12em] text-muted uppercase">{s.label}</p>
            </div>
          ))}
        </div>
        {briefing.biggestOpportunity && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[0.6rem] uppercase text-emerald-400">Biggest opportunity today</p>
            <p className="mt-1 text-sm font-medium text-cream">{briefing.biggestOpportunity.title}</p>
            <p className="mt-1 text-xs text-fog">{briefing.biggestOpportunity.detail}</p>
            <p className="mt-2 text-[0.65rem] text-muted">
              Confidence {Math.round(briefing.biggestOpportunity.confidence * 100)}% · {briefing.biggestOpportunity.expectedImpact}
            </p>
          </div>
        )}
        {briefing.biggestRisk && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-[0.6rem] uppercase text-amber-400">Biggest risk today</p>
            <p className="mt-1 text-sm text-cream">{briefing.biggestRisk.title}</p>
            <p className="mt-1 text-xs text-fog">{briefing.biggestRisk.detail}</p>
          </div>
        )}
      </section>

      {briefing.autonomousInsights.length > 0 && (
        <AdminPanel title="Autonomous insights" subtitle="ÉLEVÉ AI surfaced these without being asked">
          <ul className="space-y-2 text-sm text-fog">
            {briefing.autonomousInsights.map((i) => (
              <li key={i}>→ {i}</li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Brand institutional memory" subtitle="Never lost — permanent CMO context">
          <div className="space-y-2 text-xs text-fog">
            <p><span className="text-cream">Voice:</span> {brand.identity.voice}</p>
            <p><span className="text-cream">Visual:</span> {brand.identity.visualStyle}</p>
            <p><span className="text-cream">Goals:</span> {brand.businessGoals.slice(0, 2).join(" · ")}</p>
            <p><span className="text-cream">Advantages:</span> {brand.competitiveAdvantages.slice(0, 2).join(" · ")}</p>
            <p><span className="text-cream">Funnel:</span> {brand.salesFunnel.slice(0, 3).join(" → ")}</p>
          </div>
        </AdminPanel>

        <AdminPanel title="Revenue intelligence" subtitle="Ranked by estimated marketing ROI">
          <ul className="space-y-2">
            {revenueAttribution.slice(0, 5).map((r) => (
              <li key={r.rank} className="flex justify-between gap-2 text-xs">
                <span className="text-cream">#{r.rank} {r.activity}</span>
                <span className="text-muted">${r.revenue.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel title="Predictions" subtitle="Facts vs predictions vs assumptions clearly labeled">
        <ul className="space-y-3">
          {predictions.slice(0, 4).map((p) => (
            <li key={p.id} className="rounded-lg border border-stone/15 p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-cream">{p.subject}</p>
                <span className="text-[0.6rem] uppercase text-muted">{p.kind}</span>
              </div>
              <p className="mt-1 text-xs text-fog">
                ~{p.expectedBookings} bookings · ${p.expectedRevenue.toLocaleString()} revenue · {Math.round(p.probabilityOfSuccess * 100)}% success
              </p>
            </li>
          ))}
        </ul>
      </AdminPanel>

      {(recommendations.length > 0 || briefing.recommendedActions.length > 0) && (
        <AdminPanel title="Recommended actions" subtitle="Evidence-backed · transparent reasoning">
          <div className="space-y-3">
            {briefing.recommendedActions.slice(0, 4).map((rec) => (
              <div key={rec.id} className="border-b border-stone/15 pb-3 last:border-0">
                <p className="text-sm text-cream">{rec.title}</p>
                <p className="text-xs text-fog">{rec.why}</p>
                <p className="mt-1 text-[0.6rem] text-muted">
                  {rec.kind} · {Math.round(rec.confidence * 100)}% confidence
                  {rec.historicalEvidence.length > 0 && ` · ${rec.historicalEvidence[0]}`}
                </p>
                <BusinessActionBar actions={rec.actions} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      <AdminPanel title="Transparency" subtitle="Facts · Predictions · Assumptions · Ideas">
        <div className="grid gap-4 sm:grid-cols-2 text-xs text-fog">
          <div>
            <p className="text-[0.6rem] uppercase text-muted mb-2">Facts</p>
            <ul className="space-y-1">{transparency.facts.map((f) => <li key={f}>• {f}</li>)}</ul>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase text-muted mb-2">Assumptions</p>
            <ul className="space-y-1">{transparency.assumptions.slice(0, 4).map((a) => <li key={a}>• {a}</li>)}</ul>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}

function CampaignMemoryPanel({ cmo }: { cmo: CMOIntelligence | null }) {
  if (!cmo) return null;
  return (
    <AdminPanel title="Campaign case studies" subtitle={`${cmo.campaigns.length} permanent records`}>
      {cmo.campaigns.length === 0 ? (
        <p className="text-sm text-muted">Generate content in Create tab — every draft auto-saves as a case study.</p>
      ) : (
        <ul className="space-y-3">
          {cmo.campaigns.slice(0, 15).map((c) => (
            <li key={c.id} className="rounded-xl border border-stone/20 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium text-cream">{c.title}</p>
                <span className="text-[0.6rem] uppercase text-muted">{c.status}</span>
              </div>
              <p className="mt-1 text-xs text-fog">{c.platform} · {c.contentType}</p>
              {c.hook && <p className="mt-2 text-xs text-fog italic">&ldquo;{c.hook.slice(0, 120)}&rdquo;</p>}
              {(c.metrics.bookings || c.metrics.revenue) && (
                <p className="mt-2 text-[0.65rem] text-accent">
                  {c.metrics.bookings ?? 0} bookings · ${c.metrics.revenue ?? 0} revenue
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}

function LearningPanel({ cmo }: { cmo: CMOIntelligence | null }) {
  if (!cmo) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminPanel title="Discovered patterns" subtitle="Continuously improving models">
        <ul className="space-y-3">
          {cmo.patterns.map((p) => (
            <li key={p.id} className="rounded-lg border border-stone/15 p-3">
              <p className="text-sm text-cream">{p.pattern}</p>
              <p className="mt-1 text-xs text-fog">{p.impact}</p>
              <p className="mt-1 text-[0.6rem] text-muted">{Math.round(p.confidence * 100)}% conf · n={p.sampleSize}</p>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title="A/B test recommendations" subtitle="Declare winners after enough data">
        <ul className="space-y-3">
          {cmo.experiments.map((e) => (
            <li key={e.id} className="rounded-lg border border-stone/15 p-3">
              <p className="text-sm text-cream">{e.title}</p>
              <p className="mt-1 text-xs text-fog">{e.hypothesis}</p>
              <div className="mt-2 grid gap-1 text-[0.65rem] text-muted">
                <p>A: {e.variantA}</p>
                <p>B: {e.variantB}</p>
              </div>
              {e.status === "winner_declared" && e.winner && (
                <p className="mt-2 text-xs text-emerald-400">Winner: Variant {e.winner}</p>
              )}
            </li>
          ))}
        </ul>
      </AdminPanel>

      {cmo.clientProfiles.length > 0 && (
        <AdminPanel title="Client intelligence" subtitle="Personalization from CRM" className="lg:col-span-2">
          <ul className="grid gap-3 sm:grid-cols-2">
            {cmo.clientProfiles.slice(0, 6).map((c) => (
              <li key={c.email} className="rounded-lg border border-stone/15 p-3">
                <p className="text-sm text-cream">{c.name}</p>
                <p className="text-xs text-fog">${c.averageSpend} avg · {c.bookingHistory} bookings</p>
                {c.personalizedRecommendations[0] && (
                  <p className="mt-1 text-[0.65rem] text-accent">{c.personalizedRecommendations[0]}</p>
                )}
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
