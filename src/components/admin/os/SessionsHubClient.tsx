"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";
import { AdminMetricCard, AdminPageHeader, AdminPanel, AdminBarChart } from "@/components/admin/os/AdminOSComponents";
import type { SessionsOperatorIntel } from "@/lib/ai/types";

export function SessionsHubClient() {
  const [appStats, setAppStats] = useState<{
    totalApplications: number;
    acceptedCount: number;
    acceptanceRate: number;
    dailyTrend: { date: string; count: number }[];
  } | null>(null);
  const [volumes, setVolumes] = useState(0);

  const [sessionsIntel, setSessionsIntel] = useState<SessionsOperatorIntel | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/applications/stats").then((r) => r.json()),
      adminFetch("/api/admin/session-volumes").then((r) => r.json()),
      adminFetch("/api/admin/ai/operator").then((r) => r.json()),
    ]).then(([stats, vols, operator]) => {
      setAppStats(stats);
      setVolumes(Array.isArray(vols) ? vols.length : 0);
      setSessionsIntel(operator.sessions ?? null);
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

      {sessionsIntel && (
        <AdminPanel title="Sessions AI" subtitle="Themes, sponsors, pairings & marketing strategy">
          {sessionsIntel.openVolume && (
            <p className="mb-4 text-sm text-cream-dim">
              Vol. {sessionsIntel.openVolume.volumeNumber} — {sessionsIntel.openVolume.title} ·{" "}
              {sessionsIntel.openVolume.applications} applications · Theme: {sessionsIntel.openVolume.theme || "TBD"}
            </p>
          )}
          <p className="mb-3 text-xs text-fog">
            Suggested themes: {sessionsIntel.suggestedThemes.join(" · ")}
          </p>
          <div className="space-y-3">
            {sessionsIntel.recommendations.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-stone/20 p-3">
                <p className="text-sm text-cream">{rec.title}</p>
                <p className="text-xs text-fog">{rec.detail}</p>
                <BusinessActionBar actions={rec.actions} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

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
