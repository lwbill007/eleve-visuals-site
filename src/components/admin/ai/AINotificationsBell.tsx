"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminOverlay } from "@/components/admin/os/AdminOverlay";
import { adminFetch } from "@/lib/admin-fetch";
import { cn } from "@/lib/utils";

interface AINotificationRow {
  id: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  href: string;
  metric: string;
  read: boolean;
  createdAt: string;
}

export function AINotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AINotificationRow[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await adminFetch("/api/admin/ai/notifications?unread=1");
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications ?? []);
    } catch {
      // Preserve the last known notification state during a transient failure.
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  async function markRead(id: string) {
    const response = await adminFetch(`/api/admin/ai/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    });
    if (response.ok) await load();
  }

  const unread = items.filter((i) => !i.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-stone/30 text-fog transition-colors hover:border-accent/40 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        aria-label="AI notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ✦
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AdminOverlay
        open={open}
        onClose={() => setOpen(false)}
        title="AI alerts"
        description="Unread operational notifications."
        className="max-w-sm"
      >
            <div className="flex items-center justify-between border-b border-stone/20 px-4 py-3">
              <div>
              <p className="text-xs tracking-[0.14em] text-accent uppercase">AI Alerts</p>
              <p className="text-[0.65rem] text-muted">Only when something matters</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close alerts"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-fog hover:bg-ink/40 hover:text-cream"
              >
                ×
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">All clear — no alerts.</li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="mb-1">
                    <Link
                      href={item.href || "/admin/insights"}
                      onClick={() => {
                        setOpen(false);
                        void markRead(item.id);
                      }}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 transition-colors hover:bg-stone/20",
                        item.severity === "high" && "border-l-2 border-red-500/50"
                      )}
                    >
                      <p className="text-sm text-cream">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.detail}</p>
                      {item.metric && <p className="mt-1 text-xs text-accent">{item.metric}</p>}
                    </Link>
                  </li>
                ))
              )}
            </ul>
      </AdminOverlay>
    </>
  );
}
