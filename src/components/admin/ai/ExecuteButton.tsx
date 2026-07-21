"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminOverlay } from "@/components/admin/os/AdminOverlay";
import { cn } from "@/lib/utils";

export interface ExecuteTarget {
  id: string;
  title: string;
  href: string;
  actionLabel?: string;
  /** Prefer server inference when omitted. */
  kind?: string;
  submissionId?: string;
  evidence?: string[];
  confidence?: number;
  expectedRevenue?: number;
  expectedOutcome?: string;
}

/**
 * One-click execute for recommendations. Runs a real adapter when possible;
 * otherwise navigates. Never claims success without a server ok.
 * Every Execute permanently records a Decision Journal entry.
 */
export function ExecuteButton({
  target,
  className,
  onDone,
}: {
  target: ExecuteTarget;
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const run = useCallback(async () => {
    setPreviewOpen(false);
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: target.id,
          title: target.title,
          href: target.href,
          kind: target.kind,
          submissionId: target.submissionId,
          evidence: target.evidence,
          confidence: target.confidence,
          expectedRevenue: target.expectedRevenue,
          expectedOutcome: target.expectedOutcome,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        href?: string;
        error?: string;
        decisionId?: string;
      };
      if (!res.ok || !data.ok) {
        toast(data.error || data.message || "Execute failed.", "error");
        if (target.href) router.push(target.href);
        return;
      }
      toast(data.message || "Done.");
      onDone?.();
      const dest = data.href || target.href;
      if (dest) router.push(dest);
    } catch {
      toast("Execute failed.", "error");
      if (target.href) router.push(target.href);
    } finally {
      setBusy(false);
    }
  }, [target, toast, router, onDone]);

  return (
    <>
    <button
      type="button"
      disabled={busy}
      onClick={() => setPreviewOpen(true)}
      className={cn(
        "min-h-11 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/25 disabled:opacity-40",
        className
      )}
    >
      {busy ? "Working…" : `${target.actionLabel ?? "Execute"} →`}
    </button>
    <AdminOverlay
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={`Review: ${target.title}`}
      description="Confirm the material action before it is recorded and executed."
      className="max-w-lg"
    >
      <div className="border-b border-stone/25 px-5 py-4">
        <p className="text-[0.65rem] tracking-[0.14em] text-accent uppercase">
          Review action
        </p>
        <h2 className="mt-1 font-display text-2xl text-cream">{target.title}</h2>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed text-fog">
          This action will be sent to the server for authorization, validation, execution, and
          audit logging. No success is recorded unless the server confirms it.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted uppercase">Action type</dt>
            <dd className="mt-1 text-cream">{target.kind ?? "Server-derived"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted uppercase">Destination</dt>
            <dd className="mt-1 break-all text-cream">{target.href || "No navigation"}</dd>
          </div>
          {target.expectedRevenue != null ? (
            <div>
              <dt className="text-xs text-muted uppercase">Estimated impact</dt>
              <dd className="mt-1 text-cream">
                ${target.expectedRevenue.toLocaleString()} · estimate, not settled revenue
              </dd>
            </div>
          ) : null}
          {target.confidence != null ? (
            <div>
              <dt className="text-xs text-muted uppercase">Model confidence</dt>
              <dd className="mt-1 text-cream">{Math.round(target.confidence * 100)}%</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-col-reverse gap-2 border-t border-stone/20 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="min-h-11 rounded-lg border border-stone/35 px-4 text-sm text-fog hover:text-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="min-h-11 rounded-lg border border-accent/40 bg-accent/15 px-4 text-sm text-accent hover:bg-accent/25 disabled:opacity-40"
          >
            {busy ? "Executing…" : `Confirm ${target.actionLabel ?? "action"}`}
          </button>
        </div>
      </div>
    </AdminOverlay>
    </>
  );
}
