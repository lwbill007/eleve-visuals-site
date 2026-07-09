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
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

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

interface SubmissionRow {
  id: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  type: string;
}

export default function WorkboardPage() {
  useSetAIPage("pipeline");
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [inbox, setInbox] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [pipeRes, inboxRes] = await Promise.all([
      adminFetch("/api/admin/os/pipeline"),
      adminFetch("/api/admin/submissions?type=booking"),
    ]);
    if (pipeRes.ok) {
      const d = await pipeRes.json();
      setColumns(d.columns ?? []);
    }
    if (inboxRes.ok) {
      const d = (await inboxRes.json()) as SubmissionRow[];
      setInbox(d.filter((s) => s.status === "new" || s.status === "contacted").slice(0, 12));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stale = columns
    .flatMap((c) => c.items.map((i) => ({ ...i, stage: c.label })))
    .filter((i) => (i.ageDays ?? 0) >= 3)
    .sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

  return (
    <AdminShell title="Workboard">
      <WorkspaceChrome
        eyebrow="Work · Execute"
        title="Workboard"
        description="What needs a reply, why deals are aging, and what to do next — mark contacted or open the full pipeline."
        onRefresh={() => void load()}
        refreshing={loading}
        extra={
          <>
            <WorkspaceButton href="/admin/pipeline" variant="secondary">
              Full pipeline
            </WorkspaceButton>
            <WorkspaceButton href="/admin/crm" variant="ghost">
              People
            </WorkspaceButton>
          </>
        }
        related={[
          { label: "Pipeline", href: "/admin/pipeline", desc: "Stages" },
          { label: "Clients", href: "/admin/crm", desc: "People" },
          { label: "Email", href: "/admin/email", desc: "Send" },
          { label: "Leaks", href: "/admin/leaks", desc: "Revenue" },
        ]}
      >
        {loading && columns.length === 0 && inbox.length === 0 ? (
          <WorkspaceLoading />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminPanel title="Needs reply" subtitle={`${inbox.length} open bookings`}>
              {inbox.length === 0 ? (
                <WorkspaceEmpty
                  title="Inbox clear"
                  detail="No open booking inquiries waiting. New submissions will land here first."
                  actionHref="/admin/submissions?type=booking"
                  actionLabel="View all submissions"
                />
              ) : (
                <ul className="space-y-3">
                  {inbox.map((s) => {
                    const name =
                      (typeof s.data.fullName === "string" && s.data.fullName) ||
                      (typeof s.data.name === "string" && s.data.name) ||
                      "Lead";
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-stone/15 pb-3"
                      >
                        <div>
                          <p className="text-sm text-cream">{name}</p>
                          <p className="text-[0.65rem] text-muted">
                            {s.status} · {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ExecuteButton
                          target={{
                            id: `booking-${s.id}`,
                            title: `Contact ${name}`,
                            href: `/admin/submissions?type=booking`,
                            actionLabel: "Mark contacted",
                            kind: "mark_booking_contacted",
                            submissionId: s.id,
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel title="Stale deals (3+ days)" subtitle={`${stale.length} aging`}>
              {stale.length === 0 ? (
                <p className="text-sm text-muted">No stale pipeline items — keep momentum.</p>
              ) : (
                <ul className="space-y-3">
                  {stale.slice(0, 10).map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-stone/15 pb-3"
                    >
                      <div>
                        <p className="text-sm text-cream">{i.name}</p>
                        <p className="text-[0.65rem] text-muted">
                          {i.stage} · {i.ageDays}d · ~${i.value.toLocaleString()} est.
                        </p>
                      </div>
                      <Link
                        href="/admin/pipeline"
                        className="rounded-lg border border-accent/40 px-3 py-1.5 text-[0.65rem] text-accent uppercase"
                      >
                        Open →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {stale.length > 0 && (
                <div className="mt-4">
                  <ExecuteButton
                    target={{
                      id: "risk-stale-inquiries",
                      title: "Mark stale bookings contacted",
                      href: "/admin/submissions?type=booking",
                      actionLabel: "Mark all stale contacted",
                      kind: "mark_stale_bookings_contacted",
                    }}
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
