"use client";

import { useState } from "react";

interface Props {
  token: string;
  depositAmount: number;
  initialPaid: boolean;
  paidAmount?: number;
  paidAt?: string;
}

export function DepositSection({ token, depositAmount, initialPaid, paidAmount, paidAt }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (initialPaid) {
    return (
      <article className="border border-stone/30 p-6">
        <h2 className="headline-sm mb-2">Deposit</h2>
        <p className="body-md text-muted">
          Paid ${(paidAmount ?? depositAmount).toLocaleString()}
          {paidAt ? ` on ${new Date(paidAt).toLocaleDateString()}` : ""}.
        </p>
      </article>
    );
  }

  const pay = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${token}/deposit-session`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) {
        setError(body?.error || "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <article className="border border-stone/30 p-6">
      <h2 className="headline-sm mb-2">Deposit</h2>
      <p className="body-md mb-4 text-muted">
        A 50% deposit of ${depositAmount.toLocaleString()} secures your date.
      </p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={submitting}
        className="border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.1em] text-accent disabled:opacity-40"
      >
        {submitting ? "Redirecting…" : `Pay Deposit — $${depositAmount.toLocaleString()}`}
      </button>
    </article>
  );
}
