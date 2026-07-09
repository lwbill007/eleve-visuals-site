"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceAIStrip,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLoading,
  WorkspaceRelated,
} from "@/components/admin/os/WorkspaceFrame";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  source?: string;
  status?: string;
  revenue?: number;
}

export default function ReferralsHubPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"source" | "name">("source");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/os/crm");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setContacts((data.contacts ?? data ?? []) as ContactRow[]);
    } catch {
      setError("Could not load referral sources from CRM.");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withSource = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = contacts.filter((c) => {
      const src = (c.source || "").trim();
      if (!src) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        src.toLowerCase().includes(needle)
      );
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return (a.source || "").localeCompare(b.source || "");
    });
    return rows;
  }, [contacts, q, sort]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contacts) {
      const src = (c.source || "").trim() || "Unknown";
      if (src === "Unknown") continue;
      map.set(src, (map.get(src) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [contacts]);

  return (
    <AdminShell title="Referrals">
      <WorkspaceHeader
        eyebrow="Grow"
        title="Referrals hub"
        description="Live referral / source attribution from CRM contacts and booking inquiries — not a separate rewards program yet."
        onRefresh={() => void load()}
        refreshing={loading}
        extra={
          <Link
            href="/admin/marketing?task=campaign&focus=referral"
            className="rounded-lg border border-accent/40 px-3 py-2 text-[0.65rem] text-accent uppercase"
          >
            Draft campaign
          </Link>
        }
      />
      <WorkspaceAIStrip />

      {loading ? (
        <WorkspaceLoading />
      ) : error ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bySource.slice(0, 6).map(([source, count]) => (
              <AdminPanel key={source} title={source}>
                <p className="font-display text-3xl text-cream">{count}</p>
                <p className="text-xs text-muted">contacts with this source</p>
              </AdminPanel>
            ))}
            {bySource.length === 0 && (
              <WorkspaceEmpty
                title="No referral sources yet"
                detail="When bookings include a referral/source field, they appear here. Capture source on the booking form."
                actionHref="/admin/booking"
                actionLabel="Edit booking form"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, source…"
              className="min-w-[12rem] flex-1 border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "source" | "name")}
              className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
              aria-label="Sort"
            >
              <option value="source">Sort by source</option>
              <option value="name">Sort by name</option>
            </select>
          </div>

          {withSource.length === 0 ? (
            <WorkspaceEmpty
              title="No matching contacts"
              detail="Try clearing search, or open Clients to review all people."
              actionHref="/admin/crm"
              actionLabel="Open Clients"
            />
          ) : (
            <ul className="divide-y divide-stone/15 rounded-xl border border-stone/20">
              {withSource.slice(0, 40).map((c) => (
                <li key={c.id || c.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm text-cream">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.email} · {c.source}
                    </p>
                  </div>
                  <Link
                    href={`/admin/crm/${encodeURIComponent(c.email)}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Profile →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <WorkspaceRelated
        links={[
          { label: "Clients", href: "/admin/crm", desc: "Full CRM" },
          { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Inquiries" },
          { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
          { label: "Analytics", href: "/admin/analytics", desc: "Sources" },
        ]}
      />
    </AdminShell>
  );
}
