"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";

const HUBS = [
  {
    id: "booking",
    label: "Booking form",
    href: "/admin/booking",
    desc: "Services, budgets, and booking page copy",
    tags: ["booking", "intake"],
  },
  {
    id: "contact",
    label: "Contact page",
    href: "/admin/contact",
    desc: "Contact form fields and messaging",
    tags: ["contact"],
  },
  {
    id: "applications",
    label: "Session applications",
    href: "/admin/applications",
    desc: "ÉLEVÉ Sessions applicant intake",
    tags: ["sessions", "applications"],
  },
  {
    id: "inbox",
    label: "All submissions",
    href: "/admin/submissions",
    desc: "Every form response in one inbox",
    tags: ["inbox"],
  },
  {
    id: "copy",
    label: "Page copy / FAQ",
    href: "/admin/content",
    desc: "Labels, FAQ, and shared form copy",
    tags: ["copy"],
  },
] as const;

export default function FormsHubPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return HUBS;
    return HUBS.filter(
      (h) =>
        h.label.toLowerCase().includes(needle) ||
        h.desc.toLowerCase().includes(needle) ||
        h.tags.some((t) => t.includes(needle))
    );
  }, [q]);

  return (
    <AdminShell title="Forms">
      <WorkspaceChrome
        eyebrow="Website"
        title="Forms hub"
        description="What: every intake touchpoint. Why: control how leads enter. Next: open a live editor. AI can draft form copy and FAQ."
        related={[
          { label: "Inbox", href: "/admin/submissions", desc: "Responses" },
          { label: "Clients", href: "/admin/crm", desc: "People" },
          { label: "Homepage", href: "/admin/homepage", desc: "Site" },
        ]}
      >
        <WorkspaceToolbar
          search={q}
          onSearch={setQ}
          searchPlaceholder="Search forms…"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <Link
              key={h.id}
              href={h.href}
              className="rounded-xl border border-stone/25 p-5 transition-colors hover:border-accent/40"
            >
              <p className="font-display text-lg text-cream">{h.label}</p>
              <p className="mt-2 text-sm text-fog">{h.desc}</p>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <AdminPanel title="No matches" className="mt-4">
            <p className="text-sm text-fog">Try another search term.</p>
          </AdminPanel>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
