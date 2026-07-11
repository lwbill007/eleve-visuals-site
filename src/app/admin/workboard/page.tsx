"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import { WORKBOARD_OPEN_STATUSES } from "@/lib/booking-pipeline";

interface PipelineItem {
  id: string;
  name: string;
  email: string;
  service: string;
  value: number;
  ageDays?: number;
  updatedAt?: string;
}

interface PipelineColumn {
  id: string;
  label: string;
  items: PipelineItem[];
}

export default function WorkboardPage() {
  useSetAIPage("pipeline");
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const pipeRes = await adminFetch("/api/admin/os/pipeline");
      if (!pipeRes.ok) throw new Error("Pipeline unavailable");
      const d = await pipeRes.json();
      setColumns(d.columns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workboard");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inbox = columns
    .filter((c) => WORKBOARD_OPEN_STATUSES.includes(c.id))
    .flatMap((c) =>
      c.items.map((i) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        status: c.id,
        service: i.service,
        value: i.value,
        ageDays: i.ageDays,
      }))
    )
    .slice(0, 12);

  const stale = columns
    .flatMap((c) => c.items.map((i) => ({ ...i, stage: c.label })))
    .filter((i) => (i.ageDays ?? 0) >= 3)
    .sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

  return (
    <AdminShell title="Workboard">
      <WorkspaceChrome
        eyebrow="Work · Execute"
        title="Workboard"
        description="What needs a reply, why deals are aging, and what to do next — advance stages or open the full pipeline."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Pipeline", href: "/admin/pipeline", desc: "Deals" },
          { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Inbox" },
          { label: "Booking AI", href: "/admin/bookings-ai", desc: "Forecasts" },
        ]}
        extra={
          <WorkspaceButton href="/admin/pipeline" variant="primary">
            Full pipeline →
          </WorkspaceButton>
        }
      >
        {loading && columns.length === 0 ? (
          <WorkspaceLoading />
        ) : error && columns.length === 0 ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminPanel title="Open inquiries" subtitle="Lead → Proposal">
              {inbox.length === 0 ? (
                <WorkspaceEmpty title="Clear" detail="No open inquiries in early stages." />
              ) : (
                <ul className="space-y-3">
                  {inbox.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone/15 p-3"
                    >
                      <div>
                        <Link
                          href={`/admin/submissions?type=booking&focus=${s.id}`}
                          className="text-sm text-cream hover:text-accent"
                        >
                          {s.name}
                        </Link>
                        <p className="text-[0.65rem] text-muted">
                          {s.status} · {s.service || "—"} · ~${s.value.toLocaleString()}
                          {s.ageDays != null ? ` · ${s.ageDays}d` : ""}
                        </p>
                      </div>
                      <ExecuteButton
                        target={{
                          id: `booking-${s.id}`,
                          title: `Advance ${s.name}`,
                          href: `/admin/submissions?type=booking&focus=${s.id}`,
                          actionLabel: "Advance to Discovery",
                          kind: "mark_booking_contacted",
                          submissionId: s.id,
                        }}
                        onDone={load}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel title="Stale deals" subtitle="3+ days without update">
              {stale.length === 0 ? (
                <p className="text-sm text-fog">No aging deals — pipeline is current.</p>
              ) : (
                <ul className="space-y-3">
                  {stale.slice(0, 10).map((i) => (
                    <li key={i.id} className="rounded-lg border border-amber-500/20 p-3">
                      <Link
                        href={`/admin/submissions?type=booking&focus=${i.id}`}
                        className="text-sm text-cream hover:text-accent"
                      >
                        {i.name}
                      </Link>
                      <p className="text-[0.65rem] text-amber-200/80">
                        {i.stage} · {i.ageDays}d idle · ~${i.value.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {stale.length > 0 && (
                <div className="mt-4">
                  <ExecuteButton
                    target={{
                      id: "stale-batch",
                      title: "Advance stale leads to Discovery",
                      href: "/admin/submissions?type=booking",
                      actionLabel: "Advance stale leads",
                      kind: "mark_stale_bookings_contacted",
                    }}
                    onDone={load}
                  />
                </div>
              )}
            </AdminPanel>
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
