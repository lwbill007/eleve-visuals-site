"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIBriefing } from "@/lib/ai/types";

function ScoreRing({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-stone/30">
        <span className="font-display text-lg text-cream">{value}</span>
      </div>
      <p className="mt-2 text-[0.6rem] tracking-[0.14em] text-muted uppercase">{label}</p>
    </div>
  );
}

export function AIBriefingPanel({ compact = false }: { compact?: boolean }) {
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/ai/briefing")
      .then((r) => r.json())
      .then(setBriefing);
  }, []);

  if (!briefing) {
    return (
      <div className="rounded-xl border border-stone/25 bg-charcoal/10 p-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-stone/30" />
        <div className="mt-3 h-16 rounded bg-stone/20" />
      </div>
    );
  }

  if (compact) {
    return (
      <Link
        href="/admin/assistant"
        className="block rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-5 transition-colors hover:border-accent/40"
      >
        <p className="label-caps text-accent">AI Briefing</p>
        <p className="mt-2 line-clamp-2 text-sm text-cream-dim">{briefing.summary}</p>
        {briefing.priorities[0] && (
          <p className="mt-3 text-xs text-accent">Priority: {briefing.priorities[0]} →</p>
        )}
      </Link>
    );
  }

  return (
    <section className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 via-charcoal/20 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-accent">AI Morning Briefing</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-dim">{briefing.summary}</p>
          {briefing.forecast && <p className="mt-2 text-xs text-fog">{briefing.forecast}</p>}
        </div>
        <Link
          href="/admin/assistant"
          className="shrink-0 rounded-lg border border-stone/30 px-4 py-2 text-xs tracking-[0.12em] text-cream uppercase hover:border-accent"
        >
          Open Assistant
        </Link>
      </div>

      {briefing.priorities.length > 0 && (
        <ul className="mt-5 space-y-2">
          {briefing.priorities.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-cream">
              <span className="text-accent">◆</span> {p}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ScoreRing label="Business" value={briefing.scores.businessHealth} />
        <ScoreRing label="Marketing" value={briefing.scores.marketing} />
        <ScoreRing label="Sales" value={briefing.scores.sales} />
        <ScoreRing label="Productivity" value={briefing.scores.productivity} />
      </div>
    </section>
  );
}
