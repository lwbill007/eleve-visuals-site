"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminMetricCard, AdminPanel, AdminBarChart } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import type { SessionsOperatorIntel } from "@/lib/ai/types";

type AppStats = {
  totalApplications: number;
  acceptedCount: number;
  acceptanceRate: number;
  dailyTrend: { date: string; count: number }[];
};

function isSessionsOperatorIntel(value: unknown): value is SessionsOperatorIntel {
  if (!value || typeof value !== "object") return false;
  const data = value as SessionsOperatorIntel;
  return (
    typeof data.generatedAt === "string" &&
    Array.isArray(data.suggestedThemes) &&
    Array.isArray(data.recommendations)
  );
}

export function SessionsHubClient() {
  const [appStats, setAppStats] = useState<AppStats | null>(null);
  const [volumes, setVolumes] = useState(0);
  const [sessionsIntel, setSessionsIntel] = useState<SessionsOperatorIntel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useSetAIPage("sessions", sessionsIntel?.openVolume ? { volume: sessionsIntel.openVolume.title } : undefined);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [statsRes, volumesRes, operatorRes] = await Promise.all([
        adminFetch("/api/admin/applications/stats"),
        adminFetch("/api/admin/session-volumes"),
        adminFetch("/api/admin/ai/operator"),
      ]);

      if (statsRes.ok) {
        setAppStats((await statsRes.json()) as AppStats);
      }

      if (volumesRes.ok) {
        const vols: unknown = await volumesRes.json();
        setVolumes(Array.isArray(vols) ? vols.length : 0);
      }

      if (operatorRes.ok) {
        const operator: unknown = await operatorRes.json();
        const sessions =
          operator && typeof operator === "object"
            ? (operator as { sessions?: unknown }).sessions
            : undefined;
        setSessionsIntel(isSessionsOperatorIntel(sessions) ? sessions : null);
      }

      if (!statsRes.ok && !volumesRes.ok && !operatorRes.ok) {
        throw new Error("Failed to load sessions hub data");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions hub");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trend =
    appStats?.dailyTrend.map((d) => ({
      month: d.date.slice(5),
      value: d.count,
    })) ?? [];

  if (loading && !appStats && !sessionsIntel) {
    return <WorkspaceLoading />;
  }

  if (error && !appStats && !sessionsIntel) {
    return <WorkspaceError message={error} onRetry={() => void load()} />;
  }

  return (
    <WorkspaceChrome
      eyebrow="Make · Sessions"
      title="Sessions Hub"
      description="What happened with applications, why volumes need attention, and what to do next — accept, edit, or draft emails."
      onRefresh={() => void load()}
      refreshing={loading}
      extra={
        <WorkspaceButton href="/admin/sessions" variant="secondary">
          Manage volumes
        </WorkspaceButton>
      }
      related={[
        { label: "Applications", href: "/admin/applications", desc: "Decide" },
        { label: "Volumes", href: "/admin/sessions", desc: "Edit" },
        { label: "Portfolio", href: "/admin/portfolio", desc: "Publish" },
        { label: "Business Brain", href: "/admin/memory", desc: "Context" },
      ]}
    >
      {error && (
        <p className="mb-4 text-xs text-amber-300">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="text-accent uppercase hover:underline">
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Total Volumes" value={volumes} href="/admin/sessions" />
        <AdminMetricCard label="Applications" value={appStats?.totalApplications ?? "—"} href="/admin/applications" />
        <AdminMetricCard label="Accepted" value={appStats?.acceptedCount ?? "—"} href="/admin/applications" />
        <AdminMetricCard label="Acceptance Rate" value={appStats ? `${appStats.acceptanceRate}%` : "—"} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
        <AdminPanel title="Sessions AI" subtitle="Themes, sponsors, pairings & marketing strategy" className="mt-8">
          {sessionsIntel.openVolume && (
            <p className="mb-4 text-sm text-cream-dim">
              Vol. {sessionsIntel.openVolume.volumeNumber} — {sessionsIntel.openVolume.title} ·{" "}
              {sessionsIntel.openVolume.applications} applications · Theme:{" "}
              {sessionsIntel.openVolume.theme || "TBD"}
            </p>
          )}
          <p className="mb-3 text-xs text-fog">
            Suggested themes: {sessionsIntel.suggestedThemes.join(" · ") || "Add a theme in Volume Editor"}
          </p>
          <div className="space-y-3">
            {(sessionsIntel.recommendations ?? []).map((rec) => (
              <div key={rec.id} className="rounded-lg border border-stone/20 p-3">
                <p className="text-sm text-cream">{rec.title}</p>
                <p className="text-xs text-fog">{rec.detail}</p>
                <BusinessActionBar actions={rec.actions ?? []} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      <AdminPanel title="AI Sessions Assistant" subtitle="Applications, schedules, and participant communications" className="mt-8">
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

      {trend.length > 0 && (
        <AdminPanel title="Applications (14 days)" className="mt-8">
          <AdminBarChart data={trend} labelKey="month" valueKey="value" accent />
        </AdminPanel>
      )}
    </WorkspaceChrome>
  );
}
