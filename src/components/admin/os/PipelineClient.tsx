"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

interface PipelineItem {
  id: string;
  name: string;
  email: string;
  service: string;
  value: number;
  createdAt: string;
}

interface PipelineColumn {
  id: string;
  label: string;
  items: PipelineItem[];
}

export function PipelineClient() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);

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
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, status: newStatus }),
    });
    if (res.ok) load();
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
        eyebrow="Revenue"
        title="Lead Pipeline"
        description={`Visual kanban for booking inquiries. Pipeline value: $${totalValue.toLocaleString()}`}
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
            <div className="space-y-2 rounded-xl border border-stone/20 bg-charcoal/10 p-2 min-h-[200px]">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragging(item.id)}
                  onDragEnd={() => setDragging(null)}
                  className="cursor-grab rounded-lg border border-stone/25 bg-ink p-3 transition-shadow active:cursor-grabbing hover:border-accent/30 hover:shadow-lg"
                >
                  <p className="font-medium text-cream">{item.name}</p>
                  {item.service && <p className="mt-1 text-xs text-fog">{item.service}</p>}
                  {item.value > 0 && (
                    <p className="mt-2 text-xs text-accent">${item.value.toLocaleString()} est.</p>
                  )}
                  <p className="mt-2 text-[0.65rem] text-muted">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              {col.items.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-muted">Drop leads here</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <AdminPanel title="Tip" subtitle="Drag cards between columns to update status instantly.">
        <p className="text-sm text-fog">
          Stages map to your existing booking statuses: New → Contacted → Booked → Completed → Inactive.
        </p>
      </AdminPanel>
    </div>
  );
}
