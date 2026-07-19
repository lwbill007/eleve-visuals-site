"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { SessionApplicationRank } from "@/lib/ai/types";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function ApplicationRankingPanel({ volumeId }: { volumeId?: string }) {
  const [ranked, setRanked] = useState<SessionApplicationRank[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = volumeId ? `?volumeId=${volumeId}&summary=1` : "?summary=1";
    adminFetch(`/api/admin/ai/sessions/rank${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRanked(d.ranked ?? []);
        setSummary(d.summary ?? "");
      });
  }, [volumeId]);

  async function refresh() {
    setLoading(true);
    const params = volumeId ? `?volumeId=${volumeId}` : "";
    const res = await adminFetch(`/api/admin/ai/sessions/rank${params}`, { method: "POST" });
    const d = await res.json();
    if (res.ok) setRanked(d.ranked ?? []);
    setLoading(false);
  }

  return (
    <AdminPanel
      title="AI Application Ranking"
      subtitle="Ranked using AI evaluation based on portfolio, experience, business value, brand alignment, and supporting evidence."
    >
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={refresh} disabled={loading} className="text-xs text-accent uppercase">
          {loading ? "Ranking…" : "✦ Re-rank"}
        </button>
      </div>
      {summary && (
        <div className="mb-4 rounded-lg border border-stone/20 bg-ink/40 p-4">
          <p className="whitespace-pre-wrap text-sm text-cream-dim">{summary}</p>
        </div>
      )}
      <ul className="space-y-2">
        {ranked.slice(0, 10).map((app, i) => (
          <li key={app.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone/20 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-cream">
                #{i + 1} {app.name}
                <span className="ml-2 text-xs text-muted">{app.roles.join(", ")}</span>
              </p>
              <p className="truncate text-xs text-fog">{app.strengths.join(" · ")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <span className="font-display text-lg text-accent">{app.score}</span>
                <p className="text-[0.6rem] text-muted">
                  {app.confidence}% confidence · {new Date(app.evaluatedAt).toLocaleDateString()}
                </p>
                <p className="text-[0.55rem] text-muted">{app.evaluationVersion}</p>
              </div>
              <Link href={app.href} className="text-xs text-accent uppercase">
                Review
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </AdminPanel>
  );
}
