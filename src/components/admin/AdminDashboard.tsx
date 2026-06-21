"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  };
}

interface AnalyticsSummary {
  periodDays: number;
  totals: {
    pageviews: number;
    uniqueSessions: number;
    conversions: number;
    conversionRate: number;
  };
  conversions: {
    booking: number;
    contact: number;
    session: number;
  };
  topPages: { path: string; views: number }[];
  topSources: { source: string; visits: number }[];
  conversionByPage: { path: string; count: number }[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
    fetch("/api/admin/analytics?days=30")
      .then((r) => r.json())
      .then(setAnalytics);
  }, []);

  if (!stats) {
    return <p className="text-fog">Loading...</p>;
  }

  const cards = [
    {
      label: "Portfolio Items",
      value: stats.content.portfolio,
      href: "/admin/portfolio",
      note: stats.content.portfolio === 0 ? "Add your first project" : undefined,
    },
    {
      label: "Unread Submissions",
      value: stats.submissions.unread,
      href: "/admin/submissions",
      note: stats.submissions.unread > 0 ? "Needs review" : "All caught up",
    },
    {
      label: "Booking Requests",
      value: stats.submissions.booking,
      href: "/admin/submissions?type=booking",
    },
    {
      label: "Session Applications",
      value: stats.submissions.session,
      href: "/admin/submissions?type=session",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-stone/30 p-6 transition-colors hover:border-stone/60"
          >
            <p className="text-xs tracking-[0.15em] text-muted uppercase">{card.label}</p>
            <p className="mt-2 font-display text-4xl text-cream">{card.value}</p>
            {card.note && <p className="mt-2 text-xs text-accent">{card.note}</p>}
          </Link>
        ))}
      </div>

      {analytics && (
        <div className="border border-stone/30 p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-cream">Analytics</h2>
              <p className="mt-1 text-xs text-muted">Last {analytics.periodDays} days</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted">Page views</p>
                <p className="font-display text-2xl text-cream">{analytics.totals.pageviews}</p>
              </div>
              <div>
                <p className="text-muted">Inquiries</p>
                <p className="font-display text-2xl text-cream">{analytics.totals.conversions}</p>
              </div>
              <div>
                <p className="text-muted">Conversion rate</p>
                <p className="font-display text-2xl text-accent">{analytics.totals.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 text-xs tracking-[0.15em] text-muted uppercase">Top pages</h3>
              <ul className="space-y-2 text-sm">
                {analytics.topPages.length === 0 ? (
                  <li className="text-fog">No data yet</li>
                ) : (
                  analytics.topPages.map((row) => (
                    <li key={row.path} className="flex justify-between gap-4 text-fog">
                      <span className="truncate">{row.path}</span>
                      <span className="shrink-0 text-cream">{row.views}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-xs tracking-[0.15em] text-muted uppercase">Traffic sources</h3>
              <ul className="space-y-2 text-sm">
                {analytics.topSources.length === 0 ? (
                  <li className="text-fog">No data yet</li>
                ) : (
                  analytics.topSources.map((row) => (
                    <li key={row.source} className="flex justify-between gap-4 text-fog">
                      <span className="truncate">{row.source}</span>
                      <span className="shrink-0 text-cream">{row.visits}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-xs tracking-[0.15em] text-muted uppercase">Inquiries by type</h3>
              <ul className="space-y-2 text-sm text-fog">
                <li className="flex justify-between">
                  <span>Bookings</span>
                  <span className="text-cream">{analytics.conversions.booking}</span>
                </li>
                <li className="flex justify-between">
                  <span>Contact</span>
                  <span className="text-cream">{analytics.conversions.contact}</span>
                </li>
                <li className="flex justify-between">
                  <span>Sessions</span>
                  <span className="text-cream">{analytics.conversions.session}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="border border-stone/30 p-6">
        <h2 className="font-display text-xl text-cream">Quick start</h2>
        <ol className="mt-4 space-y-2 text-sm text-fog">
          <li>1. Upload portfolio work in <Link href="/admin/portfolio" className="text-accent">Portfolio</Link></li>
          <li>2. Set your hero image in <Link href="/admin/content" className="text-accent">Site Content</Link></li>
          <li>3. Review services and pricing in <Link href="/admin/services" className="text-accent">Services</Link></li>
          <li>4. Update ÉLEVÉ Sessions details when ready</li>
          <li>5. Check <Link href="/admin/submissions" className="text-accent">Submissions</Link> for booking requests</li>
        </ol>
      </div>
    </div>
  );
}
