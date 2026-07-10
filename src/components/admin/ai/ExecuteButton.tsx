"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { useAdminToast } from "@/components/admin/AdminToast";
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

  const run = useCallback(async () => {
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
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className={cn(
        "rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/25 disabled:opacity-40",
        className
      )}
    >
      {busy ? "Working…" : `${target.actionLabel ?? "Execute"} →`}
    </button>
  );
}
