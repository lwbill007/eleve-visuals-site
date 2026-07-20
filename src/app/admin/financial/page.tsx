"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { cn } from "@/lib/utils";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string;
  description: string;
  source: string;
  paidAt: string;
}

export default function FinancialCenterPage() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{
    today: number;
    thisMonth: number;
    total: number;
    count: number;
    hasPayments: boolean;
  } | null>(null);
  const [stripe, setStripe] = useState<{
    health: string;
    connected: boolean;
    missing: string[];
  } | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/payments");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSummary(data.summary);
      setStripe(data.stripe);
      setPayments(data.payments ?? []);
    } catch {
      setError("Could not load Financial Center.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return payments;
    return payments.filter(
      (p) =>
        p.customerEmail.toLowerCase().includes(n) ||
        p.description.toLowerCase().includes(n) ||
        p.source.toLowerCase().includes(n)
    );
  }, [payments, q]);

  async function addManual() {
    const amountDollars = Number(amount);
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      toast("Enter a valid amount.", "error");
      return;
    }
    const res = await adminFetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountDollars,
        customerEmail: email,
        description: desc || "Manual entry",
      }),
    });
    if (res.ok) {
      toast("Payment recorded — Revenue owner can verify.");
      setAmount("");
      setEmail("");
      setDesc("");
      void load();
    } else toast("Could not save payment.", "error");
  }

  const owner = METRIC_OWNERS.financial_center;
  const capabilities: OsCapability[] = [
    {
      id: "deposits",
      label: "Deposits",
      status: summary?.hasPayments ? "partial" : "planned",
      summary: summary?.hasPayments
        ? "Settled Payment rows are live. Dedicated deposit stage linking is partial."
        : "No settled payments yet.",
      missing: summary?.hasPayments
        ? undefined
        : {
            label: "Deposits",
            reason: "No verified Payment rows for deposit tracking",
            required: ["Stripe webhook Payment rows", "Booking ↔ payment linkage"],
            confidence: 0,
            unlockAfter: "Unlock after first succeeded deposit",
            owner,
            unlockHref: "/admin/qa",
          },
    },
    {
      id: "invoices",
      label: "Invoices",
      status: "planned",
      summary: "Invoice objects are not a first-class store yet.",
      missing: {
        label: "Invoices",
        reason: "No Invoice model in Truth Layer",
        required: ["Invoice entity", "Status + due dates", "Link to Client + Booking"],
        confidence: 0,
        unlockAfter: "Unlock after Invoice schema + sync",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "expenses",
      label: "Expenses",
      status: "planned",
      summary: "Expense ledger not connected.",
      missing: {
        label: "Expenses",
        reason: "Expense tracking not instrumented",
        required: ["Expense categories", "Receipts or bank import"],
        confidence: 0,
        unlockAfter: "Unlock after expense connector",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "cashflow",
      label: "Cash Flow",
      status: summary?.hasPayments ? "partial" : "planned",
      summary: summary?.hasPayments
        ? "Inflows from Payments Verified. Outflows unknown."
        : "Cash flow requires settled inflows + expenses.",
      missing: summary?.hasPayments
        ? {
            label: "Cash Flow (complete)",
            reason: "Outflows / expenses missing — cannot compute net cash",
            required: ["Expense ledger", "Payout schedule"],
            confidence: 0,
            unlockAfter: "Unlock after expenses + payouts",
            owner,
            unlockHref: "/admin/qa",
          }
        : {
            label: "Cash Flow",
            reason: "No verified inflows yet",
            required: ["Succeeded Payment rows"],
            confidence: 0,
            unlockAfter: "Unlock after Payments Verified",
            owner,
            unlockHref: "/admin/qa",
          },
    },
    {
      id: "taxes",
      label: "Taxes",
      status: "planned",
      summary: "Tax estimates require accountant-grade inputs.",
      missing: {
        label: "Taxes",
        reason: "Tax engine not configured — never invent tax liability",
        required: ["Jurisdiction settings", "Taxable revenue rules"],
        confidence: 0,
        unlockAfter: "Unlock after tax settings",
        owner,
        unlockHref: "/admin/settings",
      },
    },
    {
      id: "profit",
      label: "Profit",
      status: "planned",
      summary: "Profit = verified revenue − verified expenses.",
      missing: {
        label: "Profit",
        reason: "Cannot compute without expenses + COGS",
        required: ["Verified expenses", "Optional COGS per project"],
        confidence: 0,
        unlockAfter: "Unlock after expense ledger",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "forecasts",
      label: "Forecasts",
      status: "planned",
      summary: "Cash forecasts labeled AI Prediction only when evidence exists.",
      missing: {
        label: "Forecasts",
        reason: "Insufficient financial history for trustworthy forecast",
        required: ["3+ months verified payments", "Pipeline conversion rates"],
        confidence: 0,
        unlockAfter: "Unlock after financial history threshold",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "refunds",
      label: "Refunds & outstanding",
      status: "planned",
      summary: "Refund and AR balances not modeled yet.",
      missing: {
        label: "Refunds / Outstanding",
        reason: "Refund + AR entities missing",
        required: ["Refund events from Stripe", "Outstanding balance per client"],
        confidence: 0,
        unlockAfter: "Unlock after refund webhook + AR model",
        owner,
        unlockHref: "/admin/qa",
      },
    },
  ];

  return (
    <AdminShell title="Financial Center">
      <WorkspaceChrome
        eyebrow="Trust · Where is the money?"
        title="Financial Center"
        description="Owns Revenue for ÉLEVÉ OS. Settled cash is Payments Verified. Invoices, expenses, taxes, and profit stay MissingMetric until data exists — never invented."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Executive QA", href: "/admin/qa", desc: "Connectors" },
          { label: "Pipeline", href: "/admin/pipeline", desc: "Estimated deals" },
          { label: "Home", href: "/admin", desc: "Revenue KPIs" },
          { label: "Timeline", href: "/admin/timeline", desc: "Payment events" },
        ]}
      >
        {loading && !summary ? (
          <WorkspaceLoading />
        ) : error ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : (
          <div className="space-y-10">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminPanel title="Revenue Today">
                <p className="font-display text-3xl text-cream">
                  ${summary?.today.toLocaleString() ?? 0}
                </p>
                <p className="mt-1 text-[0.65rem] text-muted">
                  {summary?.hasPayments ? "Payments Verified" : "Unknown until Stripe settles"}
                </p>
              </AdminPanel>
              <AdminPanel title="Revenue MTD">
                <p className="font-display text-3xl text-cream">
                  ${summary?.thisMonth.toLocaleString() ?? 0}
                </p>
              </AdminPanel>
              <AdminPanel title="Lifetime settled">
                <p className="font-display text-3xl text-cream">
                  ${summary?.total.toLocaleString() ?? 0}
                </p>
              </AdminPanel>
              <AdminPanel title="Stripe">
                <p
                  className={cn(
                    "font-display text-2xl",
                    stripe?.connected ? "text-emerald-400" : "text-amber-300"
                  )}
                >
                  {stripe?.health ?? "unknown"}
                </p>
                <p className="mt-1 text-xs text-fog">
                  {stripe?.connected
                    ? "Webhook path ready"
                    : `Missing: ${(stripe?.missing ?? []).join(", ") || "keys"}`}
                </p>
              </AdminPanel>
            </div>

            {!summary?.hasPayments && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-fog">
                No settled payments yet — Command Revenue stays Unknown/Estimated.{" "}
                <Link href="/admin/qa" className="text-accent hover:underline">
                  Executive QA →
                </Link>
              </div>
            )}

            <OsCapabilityGrid
              title="Financial domains"
              subtitle="Every domain is always visible. Unknowns show unlock criteria at 0% confidence."
              capabilities={capabilities}
            />

            <AdminPanel title="Manual deposit / payment" subtitle="Bridge until webhooks cover every settlement">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount USD"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Customer email"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                />
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Description"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                />
              </div>
              <WorkspaceButton variant="primary" onClick={() => void addManual()} className="mt-3">
                Record payment
              </WorkspaceButton>
            </AdminPanel>

            <AdminPanel
              title="Settled ledger"
              subtitle={
                filtered.length > 0
                  ? `${filtered.length} shown · Payments Verified`
                  : summary?.hasPayments
                    ? "No rows match filters"
                    : "No settled payments yet · Unknown"
              }
            >
              <WorkspaceToolbar
                search={q}
                onSearch={setQ}
                searchPlaceholder="Search email, description…"
              />
              {filtered.length === 0 ? (
                <WorkspaceEmpty
                  title="No payment rows"
                  detail="Connect Stripe webhooks or record a manual payment to unlock Verified revenue."
                  actionHref="/admin/qa"
                  actionLabel="Executive QA"
                />
              ) : (
                <ul className="divide-y divide-stone/15">
                  {filtered.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <div>
                        <p className="text-cream">
                          ${p.amount.toLocaleString()}{" "}
                          <span className="text-xs text-muted uppercase">{p.status}</span>
                        </p>
                        <p className="text-xs text-fog">
                          {p.customerEmail || "—"} · {p.description || p.source}
                        </p>
                      </div>
                      <p className="text-xs text-muted">{new Date(p.paidAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
