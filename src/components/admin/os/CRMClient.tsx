"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin/os/AdminOSComponents";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  source: string;
  tags: string[];
  status: string;
  bookings: number;
  applications: number;
  contacts: number;
  revenue: number;
  lastActivity: string;
}

export function CRMClient() {
  useSetAIPage("crm");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"activity" | "revenue" | "name">("activity");

  function load() {
    setLoading(true);
    setError("");
    adminFetch("/api/admin/os/crm")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setContacts(d.contacts ?? []))
      .catch(() => {
        setError("Could not load clients.");
        setContacts([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = contacts
    .filter((c) => {
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.source.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "revenue") return b.revenue - a.revenue;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Work"
        title="Clients"
        description="Every person who has interacted with ÉLEVÉ — unified from bookings, applications, and contact forms."
        action={
          <div className="flex gap-2">
            <AskAIButton />
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase"
            >
              Refresh
            </button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="w-full max-w-md rounded-lg border border-stone/30 bg-charcoal/30 px-4 py-3 text-sm text-cream outline-none focus:border-accent/50"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "activity" | "revenue" | "name")}
          className="rounded-lg border border-stone/30 bg-charcoal/30 px-3 py-2 text-sm text-cream"
          aria-label="Sort clients"
        >
          <option value="activity">Sort by activity</option>
          <option value="revenue">Sort by revenue</option>
          <option value="name">Sort by name</option>
        </select>
      </div>

      {loading ? (
        <p className="text-fog">Loading clients…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <AdminPanel title="No clients match">
          <p className="text-sm text-fog">
            {contacts.length === 0
              ? "No contacts yet — bookings and applications create people automatically."
              : "Try a different search."}
          </p>
        </AdminPanel>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone/25">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone/20 text-[0.65rem] tracking-[0.14em] text-muted uppercase">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">LTV</th>
                <th className="px-4 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-stone/10 transition-colors hover:bg-charcoal/20">
                  <td className="px-4 py-4">
                    <Link href={`/admin/crm/${encodeURIComponent(c.email)}`} className="block group">
                      <p className="font-medium text-cream group-hover:text-accent">{c.name || "—"}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                      {c.instagram && <p className="text-xs text-fog">@{c.instagram.replace(/^@/, "")}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <AdminStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-4 text-fog">{c.source}</td>
                  <td className="px-4 py-4 text-cream">{c.bookings}</td>
                  <td className="px-4 py-4 text-cream">{c.revenue > 0 ? `$${c.revenue.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-4 text-muted">{new Date(c.lastActivity).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPanel title="AI CRM" subtitle="Generate follow-ups and offers — always review before sending">
        <AIGeneratePanel
          task="follow_up"
          label="Follow-up email"
          prompt="Write a re-engagement email for inactive photography clients who haven't booked in 6 months."
          buttonLabel="Generate re-engagement email"
        />
        <AIGeneratePanel
          task="campaign"
          label="Upsell campaign"
          prompt="Write a campaign promoting portrait sessions to past clients with a luxury ÉLEVÉ tone."
          buttonLabel="Generate upsell campaign"
        />
      </AdminPanel>

      <p className="mt-6 text-xs text-muted">
        Need full inquiry detail?{" "}
        <Link href="/admin/submissions" className="text-accent hover:underline">
          Open submissions →
        </Link>
      </p>
    </div>
  );
}
