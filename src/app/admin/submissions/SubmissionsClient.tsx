"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

interface Submission {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export default function AdminSubmissionsClient() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const url = typeFilter
      ? `/api/admin/submissions?type=${typeFilter}`
      : "/api/admin/submissions";
    const res = await fetch(url);
    setItems(await res.json());
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string, read: boolean) {
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this submission?")) return;
    await fetch("/api/admin/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const typeLabel = (type: string) => {
    if (type === "booking") return "Booking";
    if (type === "session") return "Session App";
    return "Contact";
  };

  return (
    <AdminShell title="Submissions">
      <div className="mb-6 flex gap-2">
        {["all", "booking", "session", "contact"].map((t) => (
          <a
            key={t}
            href={t === "all" ? "/admin/submissions" : `/admin/submissions?type=${t}`}
            className={`px-3 py-1.5 text-xs uppercase ${
              (t === "all" && !typeFilter) || typeFilter === t
                ? "bg-cream text-ink"
                : "border border-stone/50 text-fog"
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border p-4 ${item.read ? "border-stone/30" : "border-accent/40 bg-charcoal/30"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-cream">
                  {typeLabel(item.type)}
                  {!item.read && <span className="ml-2 text-accent">· New</span>}
                </p>
                <p className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleString()}
                  {typeof item.data.fullName === "string" && ` · ${item.data.fullName}`}
                  {typeof item.data.name === "string" && ` · ${item.data.name}`}
                  {typeof item.data.email === "string" && ` · ${item.data.email}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="text-xs text-accent"
                >
                  {expanded === item.id ? "Hide" : "View"}
                </button>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markRead(item.id, true)}
                    className="text-xs text-fog"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-xs text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === item.id && (
              <pre className="mt-4 overflow-x-auto border border-stone/20 bg-ink p-4 text-xs text-fog">
                {JSON.stringify(item.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-12 text-center text-fog">No submissions yet.</p>
        )}
      </div>
    </AdminShell>
  );
}
