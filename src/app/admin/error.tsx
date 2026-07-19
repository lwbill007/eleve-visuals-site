"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-stone/25 bg-charcoal/30 p-8 text-center">
        <p className="text-[0.65rem] tracking-[0.18em] text-amber-300 uppercase">Something broke</p>
        <h2 className="mt-2 font-display text-2xl text-cream">This module failed to load</h2>
        <p className="mt-3 text-sm text-fog">
          The error was logged. This is an isolated failure — the rest of ÉLEVÉ OS is unaffected. Retry, or
          return to the command center.
        </p>
        {error.message && (
          <p className="mt-3 break-words rounded-lg border border-stone/20 bg-ink/40 px-3 py-2 font-mono text-[0.65rem] text-amber-200/90">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="mt-2 font-mono text-[0.65rem] text-muted">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs tracking-[0.1em] text-accent uppercase transition-colors hover:bg-accent/20"
          >
            Retry
          </button>
          <a
            href="/admin"
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs tracking-[0.1em] text-fog uppercase transition-colors hover:border-stone/50 hover:text-cream"
          >
            Command Center
          </a>
        </div>
      </div>
    </div>
  );
}
