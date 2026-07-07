"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import type { ProductionReadinessReport } from "@/lib/ai/truth/types";
import { cn } from "@/lib/utils";

export function ExecutiveQADashboard() {
  const [report, setReport] = useState<ProductionReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/ai/qa");
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !report) return <p className="text-fog">Running executive QA checks…</p>;
  if (!report) return <p className="text-fog">QA report unavailable.</p>;

  const scoreColor =
    report.overallScore >= 85 ? "text-emerald-400" : report.overallScore >= 65 ? "text-amber-300" : "text-red-400";

  return (
    <div>
      <AdminPageHeader
        eyebrow="Operation: Production Readiness"
        title="Executive QA"
        description="Continuous verification of database, APIs, memory integrity, graph density, and integrations."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-accent"
          >
            Re-run QA
          </button>
        }
      />

      <div className="mb-8 rounded-xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-[0.6rem] uppercase text-muted">Overall platform health</p>
        <p className={cn("font-display text-5xl", scoreColor)}>{report.overallScore}</p>
        <p className="mt-2 text-xs text-fog">Generated {new Date(report.generatedAt).toLocaleString()}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminPanel title="Database">
          <p className="text-2xl text-cream">{report.database.score}</p>
          <p className="text-xs text-fog">{report.database.detail}</p>
        </AdminPanel>
        <AdminPanel title="Memory verification">
          <p className="text-2xl text-cream">{report.memory.verifiedPct}%</p>
          <p className="text-xs text-fog">Target 90% · {report.memory.pending} pending</p>
        </AdminPanel>
        <AdminPanel title="Knowledge graph">
          <p className="text-2xl text-cream">{report.graph.healthScore}</p>
          <p className="text-xs text-fog">
            {report.graph.edges}/{report.graph.targetEdges} edges · {report.graph.status}
          </p>
        </AdminPanel>
        <AdminPanel title="APIs">
          <p className="text-2xl text-cream">{report.apis.score}</p>
          <p className="text-xs text-fog">
            {report.apis.passed}/{report.apis.total} probed
          </p>
        </AdminPanel>
      </div>

      {report.issues.length > 0 && (
        <AdminPanel title="Issues (ranked)" subtitle="Fix before adding new intelligence modules" className="mb-8">
          <ul className="space-y-3">
            {report.issues.map((issue) => (
              <li
                key={issue.title}
                className={cn(
                  "rounded-lg border p-3 text-xs",
                  issue.severity === "critical"
                    ? "border-red-500/30 bg-red-500/5"
                    : issue.severity === "high"
                      ? "border-amber-500/30"
                      : "border-stone/20"
                )}
              >
                <p className="text-cream">
                  [{issue.severity}] {issue.title}
                </p>
                <p className="mt-1 text-accent">Fix: {issue.fix}</p>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <AdminPanel title="Integration truth sources" className="mb-8">
        <ul className="grid gap-2 sm:grid-cols-2 text-xs">
          {report.integrations.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded border border-stone/15 px-3 py-2">
              <span className="text-cream">{i.label}</span>
              <span className={i.connected ? "text-emerald-400" : "text-red-400"}>
                {i.connected ? "Connected" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <div className="flex flex-wrap gap-4 text-xs">
        <Link href="/admin/memory" className="text-accent hover:underline">
          Verification Queue →
        </Link>
        <Link href="/admin/intelligence" className="text-accent hover:underline">
          Command Center →
        </Link>
      </div>
    </div>
  );
}
