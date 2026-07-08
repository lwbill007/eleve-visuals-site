"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
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
}

interface PipelineColumn {
  id: string;
  label: string;
  items: PipelineItem[];
}

export function PipelineClient() {
  const { toast } = useAdminToast();
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await adminFetch("/api/admin/os/pipeline");
    if (res.ok) {
      const data = await res.json();
      setColumns(data.columns ?? []);
      setTotalValue(data.totalValue ?? 0);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function moveItem(itemId: string, newStatus: string) {
    setBusyId(itemId);
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, status: newStatus }),
    });
    setBusyId(null);
    if (res.ok) {
      toast(newStatus === "contacted" ? "Marked contacted." : "Stage updated.");
      load();
    } else {
      toast("Update failed.", "error");
    }
  }

  function onDrop(columnId: string) {
    if (dragging) {
      moveItem(dragging, columnId);
      setDragging(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Work"
        title="Pipeline"
        description={`Deal board for booking inquiries. Values are estimated from budget ranges — not settled payments. Pipeline: ~$${totalValue.toLocaleString()} est.`}
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-72 shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs tracking-[0.14em] text-cream-dim uppercase">{col.label}</h3>
              <span className="rounded-full bg-stone/30 px-2 py-0.5 text-xs text-muted">{col.items.length}</span>
            </div>
            <div className="min-h-[200px] space-y-2 rounded-xl border border-stone/20 bg-charcoal/10 p-2">
              {col.items.map((item) => {
                const stale = (item.ageDays ?? 0) >= 3 && (col.id === "new" || col.id === "contacted");
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
                          href={`/admin/crm?search=${encodeURIComponent(item.email)}`}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] tracking-[0.08em] text-muted uppercase hover:text-accent"
                          title="Open in CRM"
                          onClick={(e) => e.stopPropagation()}
                        >
                          CRM
                        </Link>
                      )}
                    </div>
                    {col.id === "new" && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void moveItem(item.id, "contacted");
                        }}
                        className="mt-3 w-full rounded-lg border border-accent/35 bg-accent/10 px-2 py-1.5 text-[0.6rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20 disabled:opacity-50"
                      >
                        Mark contacted
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

      <AdminPanel title="How to use" subtitle="Speed-to-lead is the highest ROI action">
        <p className="text-sm text-fog">
          Drag cards to update stage, or use Mark contacted on new leads. Values are estimated from form
          budget ranges until Stripe payments are connected. Click a name to open the full inquiry.
        </p>
      </AdminPanel>
    </div>
  );
}
