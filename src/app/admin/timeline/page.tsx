"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/ai/timeline?limit=50");
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell title="Executive Timeline">
      <AdminPageHeader
        eyebrow="Brain"
        title="Executive Timeline"
        description="Irreversible business events the AI should remember forever — payments, missions, milestones, and system events."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase"
          >
            Refresh
          </button>
        }
      />

      {loading ? (
        <p className="text-fog">Loading timeline…</p>
      ) : events.length === 0 ? (
        <AdminPanel title="Empty">
          <p className="text-sm text-fog">
            No timeline events yet. Complete missions, record payments, or wait for cron intelligence refresh.
          </p>
        </AdminPanel>
      ) : (
        <ol className="relative space-y-0 border-l border-stone/25 pl-6">
          {events.map((e) => (
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
    </AdminShell>
  );
}
