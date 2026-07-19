"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS, type MissingMetric } from "@/lib/ai/platform/metric-owners";
import { osEyebrow, osPage } from "@/lib/ai/platform/os-systems";
import { cn } from "@/lib/utils";

interface PipelineItem {
  id: string;
  name: string;
  email: string;
  service: string;
  value: number;
  valueQuality?: "estimated" | "verified";
  createdAt: string;
  updatedAt?: string;
  ageDays?: number;
  leadScore?: number;
  priority?: string;
}

interface PipelineColumn {
  id: string;
  label: string;
  items: PipelineItem[];
}

const page = osPage("pipeline")!;

function predMissing(
  label: string,
  reason: string,
  required: string[],
  unlockAfter: string
): MissingMetric {
  return {
    label,
    reason,
    required,
    confidence: 0,
    unlockAfter,
    owner: METRIC_OWNERS.pipeline,
    unlockHref: "/admin/bookings-ai",
  };
}

export function PipelineClient() {
  const { toast } = useAdminToast();
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/os/pipeline");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setColumns(data.columns ?? []);
      setTotalValue(data.totalValue ?? 0);
    } catch {
      setError("Could not load pipeline.");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveItem(itemId: string, newStatus: string) {
    setBusyId(itemId);
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, status: newStatus }),
    });
    setBusyId(null);
    if (res.ok) {
      toast(newStatus === "discovery" ? "Advanced to Consultation." : "Stage updated.");
      void load();
    } else {
      toast("Update failed.", "error");
    }
  }

  function onDrop(columnId: string) {
    if (dragging) {
      void moveItem(dragging, columnId);
      setDragging(null);
    }
  }

  const filteredColumns = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return columns.map((col) => ({
      ...col,
      items: col.items.filter((item) => {
        if (staleOnly && (item.ageDays ?? 0) < 3) return false;
        if (!needle) return true;
        return (
          item.name.toLowerCase().includes(needle) ||
          item.email.toLowerCase().includes(needle) ||
          item.service.toLowerCase().includes(needle)
        );
      }),
    }));
  }, [columns, q, staleOnly]);

  const totalItems = columns.reduce((s, c) => s + c.items.length, 0);
  const hasEstimatedValue = totalValue > 0;

  const predictionCapabilities: OsCapability[] = [
    {
      id: "win",
      label: "Win probability",
      status: "planned",
      summary: "Per-deal close probability requires Booking Intelligence model + outcomes.",
      missing: predMissing(
        "Win probability",
        "No trained win model wired to pipeline cards.",
        ["Historical close outcomes", "Booking Intelligence predictions"],
        "Unlock after Booking Intelligence verifies predictions."
      ),
    },
    {
      id: "ghost",
      label: "Ghost risk",
      status: "planned",
      summary: "Ghost / no-reply risk is not scored on the board yet.",
      missing: predMissing(
        "Ghost risk",
        "No ghost-risk scorer on pipeline deals.",
        ["Reply latency features", "Outcome labels"],
        "Unlock after silence outcomes are labeled."
      ),
    },
    {
      id: "followup",
      label: "Follow-up timing",
      status: "planned",
      summary: "Next best follow-up time is not predicted per deal.",
      missing: predMissing(
        "Follow-up timing",
        "No follow-up scheduler model on pipeline.",
        ["Contact cadence history", "Response rates"],
        "Unlock after cadence learning ships."
      ),
    },
    {
      id: "value",
      label: "Deal value",
      status: hasEstimatedValue ? "partial" : "planned",
      summary: hasEstimatedValue
        ? `~$${totalValue.toLocaleString()} from form budgets — Estimated, not ledger-verified.`
        : "No budget estimates on open deals.",
      href: hasEstimatedValue ? undefined : "/admin/qa",
      missing: hasEstimatedValue
        ? undefined
        : predMissing(
            "Deal value",
            "No open booking budget estimates to sum.",
            ["Budget range on inquiry", "Open pipeline stage"],
            "Unlock after inquiries include budget data."
          ),
    },
    {
      id: "cancel",
      label: "Cancel risk",
      status: "planned",
      summary: "Cancellation risk is not modeled on the board.",
      missing: predMissing(
        "Cancel risk",
        "No cancel-risk model — never invent churn odds.",
        ["Cancel / no-show outcomes", "Deposit status"],
        "Unlock after cancel outcomes are tracked."
      ),
    },
    {
      id: "contract_sent",
      label: "Contract Sent",
      status: "planned",
      summary: "Not a distinct status ID — proposal stage is the closest live column.",
      missing: predMissing(
        "Contract Sent stage",
        "No contract_sent status in DB — cannot move deals into a Contract Sent column.",
        ["Contract entity", "Optional new status or ops flag"],
        "Unlock after contracts are first-class."
      ),
    },
    {
      id: "deposit_paid",
      label: "Deposit Paid",
      status: "planned",
      summary: "Deposit settlement lives in Financial Center — not a pipeline status.",
      missing: {
        ...predMissing(
          "Deposit Paid stage",
          "No deposit_paid status — settled cash is owned by Financial Center.",
          ["Payment linked to booking", "Optional deposit_paid status"],
          "Unlock after booking ↔ payment linkage."
        ),
        owner: METRIC_OWNERS.financial_center,
        unlockHref: "/admin/financial",
      },
    },
  ];

  return (
    <WorkspaceChrome
      eyebrow={osEyebrow("work", page.question)}
      title="Pipeline"
      description={page.purpose}
      onRefresh={() => void load()}
      refreshing={loading}
      related={[
        { label: "Workboard", href: "/admin/workboard", desc: "Execute today" },
        { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Needs next" },
        { label: "Clients", href: "/admin/crm", desc: "People" },
        { label: "Financial", href: "/admin/financial", desc: "Verified $" },
      ]}
    >
      <WorkspaceToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search deals…"
      >
        <label className="flex items-center gap-2 text-xs text-fog">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
          />
          Stale 3+ days
        </label>
      </WorkspaceToolbar>

      {hasEstimatedValue && (
        <p className="mb-4 text-xs text-muted">
          Pipeline value ~${totalValue.toLocaleString()}{" "}
          <span className="text-amber-200/80">(Estimated from budgets)</span>
        </p>
      )}

      {loading ? (
        <WorkspaceLoading rows={3} />
      ) : error ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : totalItems === 0 ? (
        <WorkspaceEmpty
          title="Pipeline empty"
          detail="New booking inquiries appear here as deals. Check Inbox if submissions exist without stages."
          actionHref="/admin/submissions?type=booking"
          actionLabel="Open bookings"
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredColumns.map((col) => (
            <div
              key={col.id}
              className="w-72 shrink-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs tracking-[0.14em] text-cream-dim uppercase">{col.label}</h3>
                <span className="rounded-full bg-stone/30 px-2 py-0.5 text-xs text-muted">
                  {col.items.length}
                </span>
              </div>
              <div className="min-h-[200px] space-y-2 rounded-xl border border-stone/20 bg-charcoal/10 p-2">
                {col.items.map((item) => {
                  const stale =
                    (item.ageDays ?? 0) >= 3 && (col.id === "lead" || col.id === "qualified" || col.id === "discovery");
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragging(item.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "group cursor-grab rounded-lg border bg-ink p-3 transition-shadow active:cursor-grabbing hover:shadow-lg",
                        stale ? "border-amber-500/40" : "border-stone/25 hover:border-accent/30",
                        busyId === item.id && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/submissions?type=booking&focus=${item.id}`}
                          className="min-w-0 flex-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium text-cream group-hover:text-accent">{item.name}</p>
                            {stale && (
                              <span className="rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[0.5rem] tracking-[0.08em] text-amber-300 uppercase">
                                {item.ageDays}d stale
                              </span>
                            )}
                          </div>
                          {item.service && <p className="mt-1 text-xs text-fog">{item.service}</p>}
                          {item.value > 0 && (
                            <p className="mt-2 text-xs text-accent">
                              ~${item.value.toLocaleString()}{" "}
                              <span className="text-muted">(estimated)</span>
                            </p>
                          )}
                          <p className="mt-2 text-[0.65rem] text-muted">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </Link>
                        {item.email && (
                          <Link
                            href={`/admin/crm/${encodeURIComponent(item.email)}`}
                            className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] tracking-[0.08em] text-muted uppercase hover:text-accent"
                            title="Open in CRM"
                            onClick={(e) => e.stopPropagation()}
                          >
                            CRM
                          </Link>
                        )}
                      </div>
                      {col.id === "lead" && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void moveItem(item.id, "discovery");
                          }}
                          className="mt-3 w-full rounded-lg border border-accent/35 bg-accent/10 px-2 py-1.5 text-[0.6rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20 disabled:opacity-50"
                        >
                          Advance to Consultation
                        </button>
                      )}
                    </div>
                  );
                })}
                {col.items.length === 0 && (
                  <p className="px-2 py-8 text-center text-xs text-muted">Drop leads here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <OsCapabilityGrid
        className="mt-8"
        title="AI predictions & vision stages"
        subtitle="Win / ghost / follow-up / cancel stay MissingMetric until models exist. Contract Sent and Deposit Paid are not DB status IDs — do not invent columns."
        capabilities={predictionCapabilities}
      />

      {!hasEstimatedValue && !loading && totalItems > 0 && (
        <div className="mt-4">
          <MissingMetricCard
            missing={predMissing(
              "Pipeline value",
              "Deals exist but none have budget estimates.",
              ["Budget range on inquiry"],
              "Unlock after budget fields are filled."
            )}
          />
        </div>
      )}

      <AdminPanel title="How to use" subtitle="Status IDs stay stable — labels follow the sales vision" className="mt-6">
        <p className="text-sm text-fog">
          Drag cards to update stage, or Advance to Consultation on new leads. Values are estimated from form
          budget ranges until Financial Center verifies payments. Target board: Lead → Qualified →
          Consultation → Proposal → Contract Sent → Deposit Paid → Booked → Completed → Archived —
          missing stages appear above as MissingMetric, not fake columns.
        </p>
      </AdminPanel>
    </WorkspaceChrome>
  );
}
