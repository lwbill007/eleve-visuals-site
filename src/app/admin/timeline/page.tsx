"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  category: string;
  impact?: string;
  source: string;
  verified: boolean;
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/ai/timeline?limit=50");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setError("Could not load timeline.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(n) ||
        e.detail.toLowerCase().includes(n) ||
        e.category.toLowerCase().includes(n)
    );
  }, [events, q]);

  const verifiedCount = events.filter((e) => e.verified).length;
  const categories = useMemo(() => new Set(events.map((e) => e.category)).size, [events]);

  const capabilities: OsCapability[] = [
    {
      id: "events",
      label: "Business events",
      status: events.length > 0 ? "live" : "partial",
      summary:
        events.length > 0
          ? `${events.length} events loaded · ${categories} categories.`
          : "No irreversible events recorded yet.",
    },
    {
      id: "verified",
      label: "Verified events",
      status: verifiedCount > 0 ? "live" : "partial",
      summary:
        verifiedCount > 0
          ? `${verifiedCount} verified of ${events.length}.`
          : "Verification flags appear when sources confirm the event.",
    },
    {
      id: "search",
      label: "Searchable history",
      status: "live",
      summary: "Filter by title, detail, or category in this workspace.",
    },
    {
      id: "cross-system",
      label: "Cross-system attribution",
      status: "planned",
      summary: "Unified attribution across Command/Work/Create not rolled up here.",
      missing: {
        label: "Cross-system attribution",
        reason: "Timeline lists events but does not yet attribute causality across OS systems",
        required: ["Event graph edges", "System-of-origin tags", "Attribution jobs"],
        confidence: 0,
        unlockAfter: "Unlock after timeline↔graph attribution jobs",
        owner: METRIC_OWNERS.ai_operations,
        unlockHref: "/admin/memory",
      },
    },
  ];

  return (
    <AdminShell title="Timeline">
      <WorkspaceChrome
        eyebrow="Brain · What happened across the business?"
        title="Timeline"
        description="Every memorable business event — searchable forever. Only recorded facts appear; nothing is invented for empty periods."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Business Brain", href: "/admin/memory", desc: "What learned?" },
          { label: "Financial Center", href: "/admin/financial", desc: "Settled cash" },
          { label: "Briefing", href: "/admin/briefing", desc: "Today" },
          { label: "Automations", href: "/admin/automations", desc: "Jobs" },
        ]}
      >
        <OsCapabilityGrid
          title="Timeline capabilities"
          subtitle="Honesty only — empty timelines stay empty."
          capabilities={capabilities}
          className="mb-8"
        />

        <WorkspaceToolbar
          search={q}
          onSearch={setQ}
          searchPlaceholder="Filter timeline…"
        />

        {loading && events.length === 0 ? (
          <WorkspaceLoading />
        ) : error && events.length === 0 ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <WorkspaceEmpty
            title={events.length === 0 ? "Timeline is empty" : "No matching events"}
            detail={
              events.length === 0
                ? "Complete missions, record payments, or wait for cron intelligence refresh — irreversible events appear here."
                : "Try a different filter."
            }
            actionHref={events.length === 0 ? "/admin/financial" : undefined}
            actionLabel={events.length === 0 ? "Open Financial Center" : undefined}
          />
        ) : (
          <ol className="relative space-y-0 border-l border-stone/25 pl-6">
            {filtered.map((e) => (
              <li key={e.id} className="relative pb-8">
                <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border border-accent bg-ink" />
                <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                  {e.category} · {new Date(e.date).toLocaleString()}
                  {e.verified ? " · verified" : ""}
                </p>
                <h3 className="mt-1 font-display text-lg text-cream">{e.title}</h3>
                <p className="mt-1 text-sm text-fog">{e.detail}</p>
                <p className="mt-2 text-[0.65rem] text-muted">
                  {e.source}
                  {e.impact ? (
                    <span className={cn("ml-2 text-emerald-400")}>{e.impact}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
