"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
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

  return (
    <AdminShell title="Executive Timeline">
      <WorkspaceChrome
        eyebrow="Brain · Memory"
        title="Executive Timeline"
        description="What happened that the business must never forget — payments, missions, milestones — and why each event matters."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Business Brain", href: "/admin/memory", desc: "Graph" },
          { label: "Payments", href: "/admin/payments", desc: "Money" },
          { label: "Briefing", href: "/admin/briefing", desc: "Today" },
          { label: "Automations", href: "/admin/automations", desc: "Jobs" },
        ]}
      >
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
            actionHref={events.length === 0 ? "/admin/payments" : undefined}
            actionLabel={events.length === 0 ? "Record a payment" : undefined}
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
