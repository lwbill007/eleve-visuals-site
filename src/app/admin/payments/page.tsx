"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
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

export default function PaymentsPage() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    today: number;
    thisMonth: number;
    total: number;
    count: number;
    hasPayments: boolean;
  } | null>(null);
  const [stripe, setStripe] = useState<{ health: string; connected: boolean; missing: string[] } | null>(
    null
  );
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/payments");
    if (res.ok) {
      const data = await res.json();
      setSummary(data.summary);
      setStripe(data.stripe);
      setPayments(data.payments ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      toast("Payment recorded — Truth Layer can verify revenue.");
      setAmount("");
      setEmail("");
      setDesc("");
      void load();
    } else toast("Could not save payment.", "error");
  }

  return (
    <AdminShell title="Payments">
      <AdminPageHeader
        eyebrow="Trust · Finance"
        title="Payments"
        description="Settled cash for Verified revenue. Stripe webhooks land here automatically; manual entry bridges until webhooks flow."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
          >
            Refresh
          </button>
        }
      />

      {loading && !summary ? (
        <p className="text-fog">Loading payments…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminPanel title="Today">
              <p className="font-display text-3xl text-cream">
                ${summary?.today.toLocaleString() ?? 0}
              </p>
            </AdminPanel>
            <AdminPanel title="This month">
              <p className="font-display text-3xl text-cream">
                ${summary?.thisMonth.toLocaleString() ?? 0}
              </p>
            </AdminPanel>
            <AdminPanel title="All time">
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
              No settled payments yet — Command Center revenue stays{" "}
              <span className="text-cream">Estimated</span>.{" "}
              <Link href="/admin/qa" className="text-accent hover:underline">
                Missing Intel →
              </Link>
            </div>
          )}

          <AdminPanel title="Manual entry" subtitle="Use when a payment settled outside webhook">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount USD"
                className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Customer email"
                className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
              />
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description"
                className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
              />
            </div>
            <button
              type="button"
              onClick={() => void addManual()}
              className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-accent uppercase"
            >
              Record payment
            </button>
          </AdminPanel>

          <AdminPanel title="Ledger" subtitle={`${payments.length} recent`}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payment rows yet.</p>
            ) : (
              <ul className="divide-y divide-stone/15">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
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
    </AdminShell>
  );
}
