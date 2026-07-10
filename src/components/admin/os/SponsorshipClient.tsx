"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminMetricCard, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceButton,
} from "@/components/admin/os/WorkspaceFrame";

type SponsorshipData = {
  websiteTraffic: number;
  uniqueVisitors: number;
  conversionRate: number;
  emailGrowth: number;
  applicationGrowth: number;
  sessionVolumes: number;
  topSources: { source: string; visits: number }[];
};

const RELATED = [
  { label: "Analytics", href: "/admin/analytics", desc: "Traffic" },
  { label: "Reports", href: "/admin/reports", desc: "AI drafts" },
  { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
];

export function SponsorshipClient() {
  const [data, setData] = useState<SponsorshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminFetch("/api/admin/os/sponsorship")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SponsorshipData>;
      })
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch(() => {
        setData(null);
        setError("Could not load sponsorship metrics.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <WorkspaceChrome
      eyebrow="Marketing"
      title="Sponsorship Dashboard"
      description="What: sponsor-ready metrics for partnerships. Why: brand decks need live proof. Next: export PDF or generate AI narratives. AI drafts sponsor copy — you verify before sharing."
      onRefresh={load}
      refreshing={loading}
      extra={
        data ? (
          <WorkspaceButton variant="secondary" onClick={() => window.print()}>
            Export PDF
          </WorkspaceButton>
        ) : undefined
      }
      related={RELATED}
    >
      {loading && !data ? (
        <WorkspaceLoading rows={3} />
      ) : error && !data ? (
        <WorkspaceError message={error} onRetry={load} />
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AdminMetricCard label="Website Traffic (30d)" value={data.websiteTraffic.toLocaleString()} />
            <AdminMetricCard label="Unique Visitors" value={data.uniqueVisitors.toLocaleString()} />
            <AdminMetricCard label="Conversion Rate" value={`${data.conversionRate}%`} />
            <AdminMetricCard label="Email / Contacts" value={data.emailGrowth} />
            <AdminMetricCard label="Session Applications" value={data.applicationGrowth} />
            <AdminMetricCard label="Active Volumes" value={data.sessionVolumes} />
          </div>

          <AdminPanel title="Audience Sources">
            {data.topSources.length === 0 ? (
              <p className="text-sm text-fog">No source data yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.topSources.map((s) => (
                  <li key={s.source} className="flex justify-between text-sm">
                    <span className="text-fog">{s.source}</span>
                    <span className="text-cream">{s.visits} visits</span>
                  </li>
                ))}
              </ul>
            )}
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
      ) : null}
    </WorkspaceChrome>
  );
}
