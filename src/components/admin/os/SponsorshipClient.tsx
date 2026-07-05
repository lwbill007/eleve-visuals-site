"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminMetricCard, AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function SponsorshipClient() {
  const [data, setData] = useState<{
    websiteTraffic: number;
    uniqueVisitors: number;
    conversionRate: number;
    emailGrowth: number;
    applicationGrowth: number;
    sessionVolumes: number;
    topSources: { source: string; visits: number }[];
  } | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/os/sponsorship").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-fog">Loading sponsor metrics…</p>;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Sponsorship Dashboard"
        description="Sponsor-ready metrics for partnerships and brand decks."
        action={
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs tracking-[0.12em] text-cream uppercase hover:border-accent"
          >
            Export PDF
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminMetricCard label="Website Traffic (30d)" value={data.websiteTraffic.toLocaleString()} />
        <AdminMetricCard label="Unique Visitors" value={data.uniqueVisitors.toLocaleString()} />
        <AdminMetricCard label="Conversion Rate" value={`${data.conversionRate}%`} />
        <AdminMetricCard label="Email / Contacts" value={data.emailGrowth} />
        <AdminMetricCard label="Session Applications" value={data.applicationGrowth} />
        <AdminMetricCard label="Active Volumes" value={data.sessionVolumes} />
      </div>

      <AdminPanel title="Audience Sources">
        <ul className="space-y-2">
          {data.topSources.map((s) => (
            <li key={s.source} className="flex justify-between text-sm">
              <span className="text-fog">{s.source}</span>
              <span className="text-cream">{s.visits} visits</span>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title="AI Sponsor Assistant" subtitle="Export-ready sponsor narratives — review before sharing">
        <AIGeneratePanel
          task="sponsor_report"
          label="Sponsor report"
          prompt="Write a sponsor report summarizing audience growth, engagement, and brand alignment for ÉLEVÉ Visuals."
          context={data}
          buttonLabel="Generate sponsor report"
        />
        <AIGeneratePanel
          task="general"
          label="Sponsorship proposal"
          prompt="Draft a sponsorship proposal highlighting demographics, session community, and content reach."
          context={data}
          buttonLabel="Generate proposal"
        />
      </AdminPanel>
    </div>
  );
}
