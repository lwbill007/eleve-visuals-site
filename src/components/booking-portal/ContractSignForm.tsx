"use client";

import { useState } from "react";
import type { BookingTermsContent } from "@/lib/types";

interface Props {
  submissionId: string;
  token: string;
  terms: BookingTermsContent;
  clientName: string;
  packageName: string;
  preferredDate?: string;
  totalValue: number;
  depositAmount: number;
  initialStatus: "signed" | "unsigned";
  signedAt?: string;
  signerName?: string;
}

export function ContractSignForm({
  submissionId,
  token,
  terms,
  packageName,
  preferredDate,
  totalValue,
  depositAmount,
  initialStatus,
  signedAt,
  signerName,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [signedAtState, setSignedAtState] = useState(signedAt);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (status === "signed") {
    return (
      <article className="border border-stone/30 p-6">
        <h2 className="headline-sm mb-2">Contract signed</h2>
        <p className="body-md text-muted">
          Signed by {signerName || "you"}
          {signedAtState ? ` on ${new Date(signedAtState).toLocaleDateString()}` : ""}.
        </p>
      </article>
    );
  }

  const submit = async () => {
    if (!name.trim() || !agree || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/contracts/${submissionId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signerName: name.trim(), agree: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || "Could not sign the contract. Please try again.");
        return;
      }
      setSignedAtState(body.signedAt);
      setStatus("signed");
    } catch {
      setError("Could not sign the contract. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="border border-stone/30 p-6">
      <h2 className="headline-sm mb-2">Project Agreement</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 border-b border-stone/20 pb-6 text-sm">
        <div>
          <p className="text-muted">Package</p>
          <p className="text-cream">{packageName}</p>
        </div>
        {preferredDate ? (
          <div>
            <p className="text-muted">Preferred Date</p>
            <p className="text-cream">{preferredDate}</p>
          </div>
        ) : null}
        <div>
          <p className="text-muted">Total Project Value</p>
          <p className="text-cream">${totalValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted">Deposit (50%)</p>
          <p className="text-cream">${depositAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="max-h-72 space-y-6 overflow-y-auto pr-2 text-sm">
        <p className="text-muted">{terms.intro}</p>
        {terms.sections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-1 font-medium text-cream">{section.title}</h3>
            <p className="whitespace-pre-line text-muted">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4 border-t border-stone/20 pt-6">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Type your full legal name to sign</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone/30 bg-transparent px-3 py-2 text-cream"
            placeholder="Full name"
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1"
          />
          <span>I have read and agree to the terms above. This serves as my electronic signature.</span>
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!name.trim() || !agree || submitting}
          className="border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.1em] text-accent disabled:opacity-40"
        >
          {submitting ? "Signing…" : "Sign Agreement"}
        </button>
      </div>
    </article>
  );
}
