"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";

interface Stats {
  submissions: {
    booking: number;
    session: number;
    contact: number;
    unread: number;
  };
  content: {
    portfolio: number;
    services: number;
    testimonials: number;
    sessions: number;
  };
}

const QUICK_LINKS = [
  { label: "Homepage", href: "/admin/homepage", desc: "Hero, sections, featured session, CTA" },
  { label: "Portfolio", href: "/admin/portfolio", desc: "Projects, galleries, featured work" },
  { label: "Services", href: "/admin/services", desc: "Offerings, pricing, banners" },
  { label: "ÉLEVÉ Sessions", href: "/admin/sessions", desc: "Volumes, posters, applications" },
  { label: "Booking Form", href: "/admin/booking", desc: "Inquiry fields, messages, budgets" },
  { label: "Inquiries", href: "/admin/submissions?type=booking", desc: "Review and manage leads" },
  { label: "Media Library", href: "/admin/media", desc: "Uploads, URLs, reuse assets" },
  { label: "Site Settings", href: "/admin/settings", desc: "SEO, nav, footer, contact info" },
  { label: "About & Pages", href: "/admin/content", desc: "About, FAQ, brand story, page copy" },
];

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          adminFetch("/api/admin/stats"),
          adminFetch("/api/admin/session-volumes"),
        ]);
        if (!statsRes.ok) {
          setError("Could not load dashboard stats.");
          return;
        }
        const base = await statsRes.json();
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
        setStats({
          ...base,
          content: { ...base.content, sessions: sessions.length },
        });
      } catch {
        setError("Could not load dashboard.");
      }
    }
    load();
  }, []);

  if (!stats) return <p className="text-fog">Loading...</p>;

  const cards = [
    { label: "Portfolio", value: stats.content.portfolio, href: "/admin/portfolio" },
    { label: "Services", value: stats.content.services, href: "/admin/services" },
    { label: "Sessions", value: stats.content.sessions, href: "/admin/sessions" },
    { label: "Unread Inquiries", value: stats.submissions.unread, href: "/admin/submissions" },
  ];

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="max-w-2xl text-sm text-fog">
        Your control center for ÉLEVÉ Visuals — manage homepage content, portfolio, services,
        sessions, bookings, media, and site settings from one place.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-stone/30 p-6 transition-colors hover:border-accent/40"
          >
            <p className="text-xs tracking-[0.15em] text-muted uppercase">{card.label}</p>
            <p className="mt-2 font-display text-4xl text-cream">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="border border-stone/30 p-6">
        <h2 className="font-display text-xl text-cream">Manage everything</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border border-stone/30 p-4 transition-colors hover:border-stone/60 hover:bg-charcoal/20"
            >
              <p className="text-sm text-cream">{link.label}</p>
              <p className="mt-1 text-xs text-fog">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 border border-stone/30 p-6">
        <div>
          <p className="text-xs text-muted uppercase">Booking inquiries</p>
          <p className="font-display text-2xl text-cream">{stats.submissions.booking}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase">Session applications</p>
          <p className="font-display text-2xl text-cream">{stats.submissions.session}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase">Contact messages</p>
          <p className="font-display text-2xl text-cream">{stats.submissions.contact}</p>
        </div>
      </div>
    </div>
  );
}
