"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { BookingIntelligence, SalesRecommendation } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { BusinessActionBar } from "./BusinessActionBar";
import { useSetAIPage } from "./AIContextProvider";
import { AdminBarChart, AdminMetricCard, AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function BookingAssistantPanel() {
  const [intel, setIntel] = useState<BookingIntelligence | null>(null);
  const [sales, setSales] = useState<SalesRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useSetAIPage("bookings", intel ? { pipelineValue: intel.pipelineValue } : undefined);

  const load = useCallback((force = false) => {
    setError(null);
    Promise.all([
      adminFetch(`/api/admin/ai/bookings${force ? "?refresh=1" : ""}`).then(async (r) => {
        if (!r.ok) throw new Error(`Bookings API failed (${r.status})`);
        return r.json() as Promise<BookingIntelligence>;
      }),
      adminFetch("/api/admin/ai/operator").then((r) => (r.ok ? r.json() : { sales: [] })),
    ])
      .then(([bookingData, operatorData]) => {
        if (!bookingData.generatedAt || typeof bookingData.pipelineValue !== "number") {
          throw new Error("Invalid booking intelligence response");
        }
        setIntel(bookingData);
        setSales(operatorData.sales ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load booking intelligence");
        setIntel(null);
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <AdminPanel>
        <p className="text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => load(true)}
          className="mt-3 text-xs text-accent uppercase hover:underline"
        >
          Retry
        </button>
      </AdminPanel>
    );
  }

  if (!intel) return <p className="text-fog">Loading booking intelligence…</p>;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales AI"
        title="Booking Assistant"
        description="Forecasts, stale inquiries, pricing, upsells, and one-click recovery actions."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                load(true);
              }}
              className="rounded-lg border border-stone/30 px-3 py-2 text-xs text-fog uppercase hover:border-accent"
            >
              Refresh
            </button>
            <AskAIButton />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Pipeline Value"
          value={`$${intel.pipelineValue.toLocaleString()}`}
          href="/admin/pipeline"
        />
        <AdminMetricCard
          label="Bookings This Month"
          value={intel.monthBookings}
          delta={intel.monthGrowth}
          href="/admin/submissions?type=booking"
        />
        <AdminMetricCard
          label="Stale Inquiries"
          value={intel.staleInquiries}
          hint={`${intel.pendingInquiries} open in pipeline`}
          href="/admin/pipeline"
        />
        <AdminMetricCard
          label="Revenue Forecast (90d)"
          value={`$${intel.revenueForecast.toLocaleString()}`}
          hint={`~${intel.bookingForecast} inquiries projected`}
        />
      </div>

      {intel.staleInquiries > 0 && (
        <AdminPanel
          title="Needs Follow-Up"
          subtitle="Open inquiries untouched for 3+ days — speed-to-lead drives conversions"
        >
          <ul className="space-y-2">
            {intel.abandonedBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-cream">
                  {b.name} · {b.status} · {b.daysSince}d ago
                </span>
                <div className="flex gap-2">
                  <Link href={b.href} className="text-xs text-accent uppercase hover:underline">
                    Open inquiry →
                  </Link>
                  {b.email && (
                    <Link
                      href={`/admin/crm/${encodeURIComponent(b.email)}`}
                      className="text-xs text-fog uppercase hover:text-cream"
                    >
                      CRM
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <BusinessActionBar
            className="mt-4"
            actions={[
              {
                id: "pipeline",
                label: "Open Pipeline",
                type: "navigate",
                href: "/admin/pipeline",
              },
              {
                id: "recover-email",
                label: "Email Campaign",
                type: "email_clients",
                href: "/admin/marketing?focus=follow_up",
                task: "follow_up",
              },
            ]}
          />
        </AdminPanel>
      )}

      <AdminPanel title="Booking Trend">
        <AdminBarChart
          data={intel.monthlyTrend.map((m) => ({ month: m.month, value: m.count }))}
          labelKey="month"
          valueKey="value"
          accent
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted">Busy months</p>
            <p className="text-sm text-cream">{intel.busyMonths.join(", ") || "Not enough data"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Slow months</p>
            <p className="text-sm text-cream">{intel.slowMonths.join(", ") || "Not enough data"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Site conversion</p>
            <p className="text-sm text-cream">{intel.conversionTrend}% inquiry rate</p>
          </div>
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Pricing Recommendations">
          <ul className="space-y-2">
            {intel.pricingRecommendations.map((r) => (
              <li key={r} className="text-sm text-cream-dim">
                ◆ {r}
              </li>
            ))}
          </ul>
        </AdminPanel>
        <AdminPanel title="Promotion Ideas">
          <ul className="space-y-2">
            {intel.promotions.map((r) => (
              <li key={r} className="text-sm text-cream-dim">
                ◆ {r}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      {sales.length > 0 && (
        <AdminPanel title="Sales AI" subtitle="Upsells, cross-sells, and recovery opportunities">
          <div className="space-y-4">
            {sales.slice(0, 5).map((s) => (
              <div key={s.id} className="border-b border-stone/15 pb-4 last:border-0 last:pb-0">
                <p className="text-[0.6rem] uppercase text-muted">
                  {s.type.replace("_", " ")} · {s.impact} impact
                </p>
                <p className="mt-1 text-sm text-cream">{s.title}</p>
                <p className="mt-1 text-xs text-fog">{s.detail}</p>
                <BusinessActionBar actions={s.actions} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
