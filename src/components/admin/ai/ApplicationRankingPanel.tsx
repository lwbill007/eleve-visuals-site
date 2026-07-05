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
    const params = volumeId ? `?volumeId=${volumeId}&summary=1` : "?summary=1";
    const res = await adminFetch(`/api/admin/ai/sessions/rank${params}`);
    const d = await res.json();
    setRanked(d.ranked ?? []);
    setSummary(d.summary ?? "");
    setLoading(false);
  }

  return (
    <AdminPanel title="AI Application Ranking" subtitle="Scored by profile completeness — final decisions remain yours">
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
              <span className="font-display text-lg text-accent">{app.score}</span>
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
