"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPanel, AdminStatusBadge } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";

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
    // Mount-only load; refresh is explicit via WorkspaceChrome onRefresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <WorkspaceChrome
      eyebrow="Work · Clients"
      title="Clients"
      description="What happened with every person who touched ÉLEVÉ, why they matter (LTV & activity), and what to do next — follow up or re-engage."
      onRefresh={load}
      refreshing={loading}
      extra={<AskAIButton />}
      related={[
        { label: "Pipeline", href: "/admin/pipeline", desc: "Deals" },
        { label: "Workboard", href: "/admin/workboard", desc: "Inbox" },
        { label: "Email", href: "/admin/email", desc: "Send" },
        { label: "Business Brain", href: "/admin/memory", desc: "Context" },
      ]}
    >
      <WorkspaceToolbar
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Search by name, email, phone…"
      >
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "activity" | "revenue" | "name")}
          className="rounded-lg border border-stone/30 bg-charcoal/30 px-3 py-2.5 text-sm text-cream"
          aria-label="Sort clients"
        >
          <option value="activity">Sort by activity</option>
          <option value="revenue">Sort by revenue</option>
          <option value="name">Sort by name</option>
        </select>
      </WorkspaceToolbar>

      {loading && contacts.length === 0 ? (
        <WorkspaceLoading />
      ) : error && contacts.length === 0 ? (
        <WorkspaceError message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <WorkspaceEmpty
          title={contacts.length === 0 ? "No clients yet" : "No clients match"}
          detail={
            contacts.length === 0
              ? "Bookings and applications create people automatically. Once leads arrive, they appear here with LTV and activity."
              : "Try a different search or sort."
          }
          actionHref={contacts.length === 0 ? "/admin/pipeline" : undefined}
          actionLabel={contacts.length === 0 ? "Open pipeline" : undefined}
        />
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
                    <Link href={`/admin/crm/${encodeURIComponent(c.email)}`} className="group block">
                      <p className="font-medium text-cream group-hover:text-accent">{c.name || "—"}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                      {c.instagram && (
                        <p className="text-xs text-fog">@{c.instagram.replace(/^@/, "")}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <AdminStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-4 text-fog">{c.source}</td>
                  <td className="px-4 py-4 text-cream">{c.bookings}</td>
                  <td className="px-4 py-4 text-cream">
                    {c.revenue > 0 ? `$${c.revenue.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-4 text-muted">
                    {new Date(c.lastActivity).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPanel title="AI CRM" subtitle="Generate follow-ups and offers — always review before sending" className="mt-8">
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
    </WorkspaceChrome>
  );
}
