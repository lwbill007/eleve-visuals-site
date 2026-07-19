"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { BookingIntelligence } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { BusinessActionBar } from "./BusinessActionBar";
import { useSetAIPage } from "./AIContextProvider";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { AdminBarChart, AdminMetricCard, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";

function isBookingIntelligence(value: unknown): value is BookingIntelligence {
  if (!value || typeof value !== "object") return false;
  const data = value as BookingIntelligence;
  return (
    typeof data.generatedAt === "string" &&
    typeof data.pipelineValue === "number" &&
    typeof data.staleInquiries === "number" &&
    typeof data.monthBookings === "number" &&
    Array.isArray(data.monthlyTrend) &&
    Array.isArray(data.abandonedBookings) &&
    Array.isArray(data.pricingRecommendations) &&
    Array.isArray(data.promotions) &&
    Array.isArray(data.salesRecommendations)
  );
}

const RELATED = [
  { label: "Pipeline", href: "/admin/pipeline", desc: "Where is every deal?" },
  { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Inbox" },
  { label: "Clients", href: "/admin/crm", desc: "Who is this?" },
  { label: "Business Brain", href: "/admin/memory", desc: "What learned?" },
];

const CHROME = {
  eyebrow: "Brain · Will this booking close?",
  title: "Booking Intelligence",
  description:
    "Sales predictions that learn after every booking. Forecasts are labeled Estimated; close probability stays MissingMetric until outcome verification exists.",
} as const;

export function BookingAssistantPanel() {
  const [intel, setIntel] = useState<BookingIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useSetAIPage("bookings", intel ? { pipelineValue: intel.pipelineValue } : undefined);

  const load = useCallback(async (force = false) => {
    setError(null);
    setRefreshing(force);
    try {
      const res = await adminFetch(`/api/admin/ai/bookings${force ? "?refresh=1" : ""}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Bookings API failed (${res.status})`);
      }
      const bookingData: unknown = await res.json();
      if (!isBookingIntelligence(bookingData)) {
        throw new Error("Invalid booking intelligence response");
      }
      setIntel(bookingData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load booking intelligence");
      setIntel(null);
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (initialLoad && !intel && !error) {
    return (
      <WorkspaceChrome {...CHROME} related={RELATED}>
        <WorkspaceLoading rows={4} />
      </WorkspaceChrome>
    );
  }

  if (error && !intel) {
    return (
      <WorkspaceChrome {...CHROME} related={RELATED}>
        <WorkspaceError message={error} onRetry={() => void load(true)} />
      </WorkspaceChrome>
    );
  }

  if (!intel) return null;

  const sales = intel.salesRecommendations ?? [];
  const capabilities: OsCapability[] = [
    {
      id: "stale",
      label: "Stale inquiries",
      status: "live",
      summary: `${intel.staleInquiries} open inquiries idle 3+ days (measured from submissions).`,
      href: "/admin/pipeline",
    },
    {
      id: "month-bookings",
      label: "Bookings this month",
      status: "live",
      summary: `${intel.monthBookings} booking submissions this month (measured).`,
      href: "/admin/submissions?type=booking",
    },
    {
      id: "pipeline-est",
      label: "Pipeline value",
      status: "partial",
      summary: `$${intel.pipelineValue.toLocaleString()} from self-reported budgets — Estimated, not ledger-verified.`,
      href: "/admin/pipeline",
    },
    {
      id: "close-probability",
      label: "Close probability",
      status: "planned",
      summary: "Per-booking close odds require outcome verification after each booking.",
      missing: {
        label: "Close probability",
        reason: "No verified win/loss outcomes linked to predictions yet",
        required: ["Booking closed or lost outcome", "PredictionContract verification", "Learning loop"],
        confidence: 0,
        unlockAfter: "Unlock after bookings record close/loss outcomes",
        owner: METRIC_OWNERS.pipeline,
        unlockHref: "/admin/pipeline",
      },
    },
    {
      id: "forecast-accuracy",
      label: "Forecast accuracy",
      status: "planned",
      summary: "90-day revenue forecasts are Estimated until accuracy is measured.",
      missing: {
        label: "Forecast accuracy",
        reason: "Revenue forecast is model output without measured accuracy rollup",
        required: ["Settled payments in forecast window", "Prediction vs actual comparison"],
        confidence: 0,
        unlockAfter: "Unlock after forecast windows close with Payments Verified",
        owner: METRIC_OWNERS.financial_center,
        unlockHref: "/admin/financial",
      },
    },
  ];

  return (
    <WorkspaceChrome
      {...CHROME}
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      extra={<AskAIButton />}
      related={RELATED}
    >
      <div className="relative z-10 space-y-8">
        <OsCapabilityGrid
          title="Prediction honesty"
          subtitle="Measured counts stay live. Predictions are Estimated or MissingMetric — never invented close odds."
          capabilities={capabilities}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label="Pipeline Value (Estimated)"
            value={`$${intel.pipelineValue.toLocaleString()}`}
            hint="Self-reported budgets · not Payments Verified"
            href="/admin/pipeline"
          />
          <AdminMetricCard
            label="Bookings This Month"
            value={intel.monthBookings}
            delta={intel.monthGrowth}
            hint="Measured submissions"
            href="/admin/submissions?type=booking"
          />
          <AdminMetricCard
            label="Stale Inquiries"
            value={intel.staleInquiries}
            hint={`${intel.pendingInquiries} open in pipeline · measured`}
            href="/admin/pipeline"
          />
          <AdminMetricCard
            label="Revenue Forecast 90d (Estimated)"
            value={`$${intel.revenueForecast.toLocaleString()}`}
            hint={`~${intel.bookingForecast} inquiries projected · not verified`}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <MissingMetricCard
            missing={{
              label: "Will this booking close?",
              reason: "Per-inquiry close probability is not verified against outcomes",
              required: ["Closed/lost outcome on booking", "Prior prediction snapshot", "Accuracy job"],
              confidence: 0,
              unlockAfter: "Unlock after outcome learning on Booking Intelligence",
              owner: METRIC_OWNERS.pipeline,
              unlockHref: "/admin/qa",
            }}
          />
          <MissingMetricCard
            missing={{
              label: "Predicted vs actual revenue",
              reason: "Forecast figures above are Estimated — no measured accuracy yet",
              required: ["Forecast snapshot", "Settled Payment rows in window"],
              confidence: 0,
              unlockAfter: "Unlock after Payments Verified closes the forecast window",
              owner: METRIC_OWNERS.financial_center,
              unlockHref: "/admin/financial",
            }}
          />
        </div>

        {intel.staleInquiries > 0 && (
          <AdminPanel
            title="Needs Follow-Up"
            subtitle="Open inquiries with no activity for 3+ days — speed-to-lead drives conversions"
          >
            <ul className="space-y-2">
              {(intel.abandonedBookings ?? []).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-cream">
                    {b.name} · {b.status} · {b.daysSince}d idle
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
                  href: "/admin/marketing?task=follow_up",
                  task: "follow_up",
                },
              ]}
            />
          </AdminPanel>
        )}

        {sales.length > 0 && (
          <AdminPanel title="Sales recommendations" subtitle="AI suggestions — Estimated impact until outcomes verify">
            <div className="space-y-4">
              {sales.map((s) => (
                <div key={s.id} className="border-b border-stone/15 pb-4 last:border-0 last:pb-0">
                  <p className="text-[0.6rem] uppercase text-muted">
                    {s.type.replace("_", " ")} · {s.impact} impact · Estimated
                  </p>
                  <p className="mt-1 text-sm text-cream">{s.title}</p>
                  <p className="mt-1 text-xs text-fog">{s.detail}</p>
                  <BusinessActionBar actions={s.actions ?? []} compact className="mt-2" />
                </div>
              ))}
            </div>
          </AdminPanel>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel title="Pricing Recommendations" subtitle="Estimated — not market-verified">
            <ul className="space-y-2">
              {(intel.pricingRecommendations ?? []).map((r) => (
                <li key={r} className="text-sm text-cream-dim">
                  ◆ {r}
                </li>
              ))}
            </ul>
          </AdminPanel>
          <AdminPanel title="Promotion Ideas" subtitle="Estimated — not outcome-proven">
            <ul className="space-y-2">
              {(intel.promotions ?? []).map((r) => (
                <li key={r} className="text-sm text-cream-dim">
                  ◆ {r}
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>

        <AdminPanel title="Booking Trend" subtitle="Measured monthly inquiry counts">
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
              <p className="text-xs uppercase text-muted">Site conversion (Estimated)</p>
              <p className="text-sm text-cream">{intel.conversionTrend}% inquiry rate</p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </WorkspaceChrome>
  );
}
