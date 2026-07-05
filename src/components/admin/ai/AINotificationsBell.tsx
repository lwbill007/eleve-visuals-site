"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  function load() {
    adminFetch("/api/admin/ai/notifications?unread=1")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  async function markRead(id: string) {
    await adminFetch(`/api/admin/ai/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    });
    load();
  }

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-stone/30 text-fog transition-colors hover:border-accent/40 hover:text-cream"
        aria-label="AI notifications"
      >
        ✦
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-stone/30 bg-charcoal shadow-2xl">
            <div className="border-b border-stone/20 px-4 py-3">
              <p className="text-xs tracking-[0.14em] text-accent uppercase">AI Alerts</p>
              <p className="text-[0.65rem] text-muted">Only when something matters</p>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">All clear — no alerts.</li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="mb-1">
                    <Link
                      href={item.href || "/admin/insights"}
                      onClick={() => markRead(item.id)}
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
          </div>
        </>
      )}
    </div>
  );
}
