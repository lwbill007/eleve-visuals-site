"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { BookingIntelligence } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { useSetAIPage } from "./AIContextProvider";
import { AdminBarChart, AdminMetricCard, AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function BookingAssistantPanel() {
  const [intel, setIntel] = useState<BookingIntelligence | null>(null);
  useSetAIPage("bookings", intel ? { pipelineValue: intel.pipelineValue } : undefined);

  useEffect(() => {
    adminFetch("/api/admin/ai/bookings").then((r) => r.json()).then(setIntel);
  }, []);

  if (!intel) return <p className="text-fog">Loading booking intelligence…</p>;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Revenue"
        title="AI Booking Assistant"
        description="Forecasts, abandoned inquiries, pricing, and promotions."
        action={<AskAIButton />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Revenue Forecast (90d)" value={`$${intel.revenueForecast.toLocaleString()}`} />
        <AdminMetricCard label="Booking Forecast (90d)" value={intel.bookingForecast} />
        <AdminMetricCard label="Pipeline Value" value={`$${intel.pipelineValue.toLocaleString()}`} />
        <AdminMetricCard label="Churn Rate" value={`${intel.churnRate}%`} />
      </div>

      <AdminPanel title="Booking Trend">
        <AdminBarChart data={intel.monthlyTrend.map((m) => ({ month: m.month, value: m.count }))} labelKey="month" valueKey="value" accent />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted">Busy months</p>
            <p className="text-sm text-cream">{intel.busyMonths.join(", ") || "Not enough data"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Slow months</p>
            <p className="text-sm text-cream">{intel.slowMonths.join(", ") || "Not enough data"}</p>
          </div>
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Pricing Recommendations">
          <ul className="space-y-2">
            {intel.pricingRecommendations.map((r) => (
              <li key={r} className="text-sm text-cream-dim">◆ {r}</li>
            ))}
          </ul>
        </AdminPanel>
        <AdminPanel title="Promotion Ideas">
          <ul className="space-y-2">
            {intel.promotions.map((r) => (
              <li key={r} className="text-sm text-cream-dim">◆ {r}</li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      {intel.abandonedBookings.length > 0 && (
        <AdminPanel title="Abandoned Bookings" subtitle="Unread inquiries older than 3 days">
          <ul className="space-y-2">
            {intel.abandonedBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-cream">{b.name} · {b.daysSince}d ago</span>
                <Link href={b.href} className="text-xs text-accent uppercase">
                  Recover →
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
