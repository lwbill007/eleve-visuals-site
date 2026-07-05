"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminMetricCard, AdminPageHeader, AdminPanel, AdminBarChart } from "@/components/admin/os/AdminOSComponents";

export function SessionsHubClient() {
  const [appStats, setAppStats] = useState<{
    totalApplications: number;
    acceptedCount: number;
    acceptanceRate: number;
    dailyTrend: { date: string; count: number }[];
  } | null>(null);
  const [volumes, setVolumes] = useState(0);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/applications/stats").then((r) => r.json()),
      adminFetch("/api/admin/session-volumes").then((r) => r.json()),
    ]).then(([stats, vols]) => {
      setAppStats(stats);
      setVolumes(Array.isArray(vols) ? vols.length : 0);
    });
  }, []);

  const trend =
    appStats?.dailyTrend.map((d) => ({
      month: d.date.slice(5),
      value: d.count,
    })) ?? [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="ÉLEVÉ Sessions"
        title="Sessions Hub"
        description="Applications, volumes, and community growth in one place."
        action={
          <Link
            href="/admin/sessions"
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs tracking-[0.12em] text-cream uppercase hover:border-accent"
          >
            Manage Volumes
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Total Volumes" value={volumes} href="/admin/sessions" />
        <AdminMetricCard label="Applications" value={appStats?.totalApplications ?? "—"} href="/admin/applications" />
        <AdminMetricCard label="Accepted" value={appStats?.acceptedCount ?? "—"} href="/admin/applications" />
        <AdminMetricCard label="Acceptance Rate" value={appStats ? `${appStats.acceptanceRate}%` : "—"} />
      </div>

      {trend.length > 0 && (
        <AdminPanel title="Applications (14 days)">
          <AdminBarChart data={trend} labelKey="month" valueKey="value" accent />
        </AdminPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/applications" className="rounded-xl border border-stone/25 p-5 hover:border-accent/30">
          <p className="font-display text-lg text-cream">Application Pipeline</p>
          <p className="mt-1 text-sm text-muted">Review, accept, waitlist, and decline applicants.</p>
        </Link>
        <Link href="/admin/sessions" className="rounded-xl border border-stone/25 p-5 hover:border-accent/30">
          <p className="font-display text-lg text-cream">Volume Editor</p>
          <p className="mt-1 text-sm text-muted">Themes, cast, galleries, featured video, and timeline.</p>
        </Link>
      </div>

      <AdminPanel title="AI Sessions Assistant" subtitle="Applications, schedules, and participant communications">
        <AIGeneratePanel
          task="session_email"
          label="Acceptance email"
          prompt="Write a warm acceptance email for an ÉLEVÉ Sessions participant with shoot date placeholder and next steps."
          buttonLabel="Generate acceptance email"
        />
        <AIGeneratePanel
          task="session_email"
          label="Rejection email"
          prompt="Write a gracious rejection email for an ÉLEVÉ Sessions applicant, encouraging future applications."
          buttonLabel="Generate rejection email"
        />
        <AIGeneratePanel
          task="general"
          label="Shoot checklist"
          prompt="Create a pre-shoot checklist for an ÉLEVÉ Sessions volume day including call sheet items."
          buttonLabel="Generate checklist"
        />
      </AdminPanel>
    </div>
  );
}
