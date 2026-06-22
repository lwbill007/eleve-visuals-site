"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";

interface DashboardStats {
  bookings: { total: number; pending: number; confirmed: number; completed: number };
  applications: { total: number; new: number };
  inquiries: { total: number; unread: number; contact: number };
  content: {
    portfolio: number;
    portfolioPublished: number;
    services: number;
    servicesPublished: number;
    testimonials: number;
    sessions: number;
    openApplications: number;
  };
  analytics: { pageviews7d: number };
  recentActivity: {
    id: string;
    type: string;
    status: string;
    read: boolean;
    name: string;
    createdAt: string;
  }[];
}

const QUICK_ACTIONS = [
  { label: "New Portfolio Project", href: "/admin/portfolio", desc: "Add work to the archive" },
  { label: "New Service", href: "/admin/services", desc: "Create or edit offerings" },
  { label: "New Session Volume", href: "/admin/sessions", desc: "Launch a Sessions release" },
  { label: "Review Inquiries", href: "/admin/submissions?type=booking", desc: "Booking CRM" },
  { label: "Session Applications", href: "/admin/applications", desc: "Applicant pipeline" },
  { label: "Edit Homepage", href: "/admin/homepage", desc: "Hero, stats, sections" },
  { label: "Upload Media", href: "/admin/media", desc: "Central asset library" },
  { label: "Site Settings", href: "/admin/settings", desc: "SEO, nav, contact" },
];

function activityLabel(type: string) {
  if (type === "booking") return "Booking inquiry";
  if (type === "session") return "Session application";
  return "Contact message";
}

function activityHref(type: string) {
  return `/admin/submissions?type=${type === "contact" ? "contact" : type}`;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Could not load dashboard."));
  }, []);

  if (!stats) {
    return <p className="text-fog">{error || "Loading dashboard..."}</p>;
  }

  const metricCards = [
    { label: "Total bookings", value: stats.bookings.total, href: "/admin/submissions?type=booking" },
    { label: "Pending inquiries", value: stats.bookings.pending, href: "/admin/submissions?type=booking&status=new" },
    { label: "Confirmed shoots", value: stats.bookings.confirmed, href: "/admin/submissions?type=booking&status=scheduled" },
    { label: "Session applications", value: stats.applications.total, href: "/admin/submissions?type=session" },
    { label: "Pending review", value: stats.applications.new, href: "/admin/applications?status=pending_review" },
    { label: "Unread messages", value: stats.inquiries.unread, href: "/admin/submissions" },
    { label: "Active sessions", value: stats.content.sessions, href: "/admin/sessions" },
    { label: "Open applications", value: stats.content.openApplications, href: "/admin/sessions" },
  ];

  const contentCards = [
    { label: "Portfolio", value: `${stats.content.portfolioPublished}/${stats.content.portfolio}`, href: "/admin/portfolio" },
    { label: "Services", value: `${stats.content.servicesPublished}/${stats.content.services}`, href: "/admin/services" },
    { label: "Testimonials", value: stats.content.testimonials, href: "/admin/testimonials" },
    { label: "7-day pageviews", value: stats.analytics.pageviews7d, href: "/admin" },
  ];

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="max-w-2xl text-sm text-fog">
        ÉLEVÉ Control — your production CMS. Manage bookings, sessions, portfolio, services, and
        site content from one place.
      </p>

      <div>
        <h2 className="label-caps mb-4 text-muted">Operations</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="border border-stone/30 p-5 transition-colors hover:border-accent/40 hover:bg-charcoal/20"
            >
              <p className="text-xs tracking-[0.12em] text-muted uppercase">{card.label}</p>
              <p className="mt-2 font-display text-4xl text-cream">{card.value}</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="label-caps mb-4 text-muted">Content & Traffic</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {contentCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="border border-stone/30 p-5 transition-colors hover:border-stone/60"
            >
              <p className="text-xs tracking-[0.12em] text-muted uppercase">{card.label}</p>
              <p className="mt-2 font-display text-3xl text-cream">{card.value}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="border border-stone/30 p-6 lg:col-span-7">
          <h2 className="font-display text-xl text-cream">Recent activity</h2>
          <div className="mt-6 space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-fog">No submissions yet.</p>
            ) : (
              stats.recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={activityHref(item.type)}
                  className={`flex items-center justify-between gap-4 border p-4 transition-colors hover:bg-charcoal/20 ${
                    item.read ? "border-stone/20" : "border-accent/30 bg-charcoal/20"
                  }`}
                >
                  <div>
                    <p className="text-sm text-cream">
                      {activityLabel(item.type)}
                      {item.name && ` · ${item.name}`}
                      {!item.read && <span className="ml-2 text-accent">New</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(item.createdAt).toLocaleString()} · {item.status}
                    </p>
                  </div>
                  <span className="text-xs text-accent">View →</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="border border-stone/30 p-6 lg:col-span-5">
          <h2 className="font-display text-xl text-cream">Quick actions</h2>
          <div className="mt-6 grid gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="border border-stone/30 p-4 transition-colors hover:border-stone/60 hover:bg-charcoal/20"
              >
                <p className="text-sm text-cream">{action.label}</p>
                <p className="mt-1 text-xs text-fog">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
