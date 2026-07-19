"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceChrome,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceButton,
} from "@/components/admin/os/WorkspaceFrame";
import type { ProductionReadinessReport } from "@/lib/ai/truth/types";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { cn } from "@/lib/utils";

interface MissingIntelItem {
  id: string;
  title: string;
  missing: string;
  whyItMatters: string;
  confidenceLost: string;
  businessImpact: string;
  revenueImpact: string;
  howToFix: string;
  estimatedImprovement: string;
  severity: "critical" | "high" | "medium" | "low";
  href: string;
}

interface MissingIntelResponse {
  items: MissingIntelItem[];
  payments: { hasPayments: boolean; count: number };
  generatedAt: string;
}

export function ExecutiveQADashboard() {
  const [report, setReport] = useState<ProductionReadinessReport | null>(null);
  const [missing, setMissing] = useState<MissingIntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [qaRes, missRes] = await Promise.all([
        adminFetch("/api/admin/ai/qa"),
        adminFetch("/api/admin/ai/missing-intel"),
      ]);
      if (!qaRes.ok && !missRes.ok) {
        throw new Error("Could not load Executive QA.");
      }
      if (qaRes.ok) setReport(await qaRes.json());
      else setReport(null);
      if (missRes.ok) setMissing(await missRes.json());
      else setMissing(null);
      if (!qaRes.ok || !missRes.ok) {
        setError("Partial load — some Trust panels failed. Retry to refresh.");
      }
    } catch (e) {
      setReport(null);
      setMissing(null);
      setError(e instanceof Error ? e.message : "Could not load Executive QA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoreColor =
    report && report.overallScore >= 85
      ? "text-emerald-400"
      : report && report.overallScore >= 65
        ? "text-amber-300"
        : "text-red-400";

  const critical = missing?.items.filter((i) => i.severity === "critical" || i.severity === "high") ?? [];
  const capabilities: OsCapability[] = [
    {
      id: "gaps",
      label: "Missing intelligence",
      status: (missing?.items.length ?? 0) > 0 ? "live" : "partial",
      summary:
        (missing?.items.length ?? 0) > 0
          ? `${missing!.items.length} gaps · ${critical.length} critical/high.`
          : "No critical gaps loaded — or sources look healthy.",
    },
    {
      id: "readiness",
      label: "Platform readiness",
      status: report ? "live" : "partial",
      summary: report
        ? `Score ${report.overallScore} · ${report.issues.length} engineering issues.`
        : "Readiness report unavailable.",
    },
    {
      id: "payments",
      label: "Payments verification path",
      status: missing?.payments.hasPayments ? "live" : "planned",
      summary: missing?.payments.hasPayments
        ? `${missing.payments.count} settled Payment rows (Verified path live).`
        : "No settled payments — revenue stays Estimated until Stripe lands.",
      href: "/admin/financial",
      missing: missing?.payments.hasPayments
        ? undefined
        : {
            label: "Payments Verified",
            reason: "No settled Payment rows — cash cannot be verified",
            required: ["Stripe webhook writing Payment rows", "At least one succeeded payment"],
            confidence: 0,
            unlockAfter: "Unlock after Financial Center records a settled payment",
            owner: METRIC_OWNERS.financial_center,
            unlockHref: "/admin/financial",
          },
    },
    {
      id: "auto-fix-verify",
      label: "Auto-fix verification loop",
      status: "planned",
      summary: "Fix suggestions exist; automated re-verify after fix is not wired.",
      missing: {
        label: "Auto-fix verification",
        reason: "Gaps list howToFix but do not auto-reverify after connector changes",
        required: ["Connector health re-probe", "Gap closed confirmation"],
        confidence: 0,
        unlockAfter: "Unlock after QA re-probe jobs on connector change",
        owner: METRIC_OWNERS.ai_operations,
        unlockHref: "/admin/ai-operations",
      },
    },
  ];

  return (
    <WorkspaceChrome
      eyebrow="Trust · What is broken or incomplete?"
      title="Executive QA"
      description="Automated audits with evidence, fix paths, and verification targets. Gaps stay honest — never invent readiness."
      onRefresh={() => void load()}
      refreshing={loading}
      related={[
        { label: "Financial Center", href: "/admin/financial", desc: "Where is the money?" },
        { label: "AI Operations", href: "/admin/ai-operations", desc: "Is AI trustworthy?" },
        { label: "Settings", href: "/admin/settings", desc: "Configuration" },
        { label: "Business Brain", href: "/admin/memory", desc: "Verification" },
      ]}
    >
      {loading && !report && !missing ? (
        <WorkspaceLoading rows={4} />
      ) : error && !report && !missing ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : (
        <>
          {error && (
            <p className="mb-4 text-xs text-amber-300" role="status">
              {error}{" "}
              <button type="button" onClick={() => void load()} className="text-accent uppercase hover:underline">
                Retry
              </button>
            </p>
          )}

          <OsCapabilityGrid
            title="QA capabilities"
            subtitle="Every domain visible. Unknowns use MissingMetric unlock criteria."
            capabilities={capabilities}
            className="mb-8"
          />

          {missing && (
            <div className="mb-6 rounded-xl border border-stone/20 bg-charcoal/20 px-4 py-3 text-sm text-fog">
              Financial Center:{" "}
              <span className="text-cream">
                {missing.payments.hasPayments
                  ? `${missing.payments.count} settled row${missing.payments.count === 1 ? "" : "s"} (Payments Verified)`
                  : "None yet — revenue stays Estimated until Stripe webhooks land"}
              </span>
            </div>
          )}

          {missing && missing.items.length > 0 ? (
            <div className="mb-10 space-y-4">
              {missing.items.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-5",
                    item.severity === "critical"
                      ? "border-red-500/35 bg-red-500/5"
                      : item.severity === "high"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-stone/20"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.55rem] tracking-[0.14em] text-muted uppercase">
                      {item.severity}
                    </span>
                    <h3 className="font-display text-lg text-cream">{item.title}</h3>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Missing</dt>
                      <dd className="mt-1 text-fog">{item.missing}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Why it matters</dt>
                      <dd className="mt-1 text-fog">{item.whyItMatters}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Confidence lost</dt>
                      <dd className="mt-1 text-fog">{item.confidenceLost}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Revenue impact</dt>
                      <dd className="mt-1 text-fog">{item.revenueImpact}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">How to fix</dt>
                      <dd className="mt-1 text-cream">{item.howToFix}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">After fix (Estimated)</dt>
                      <dd className="mt-1 text-emerald-400/90">{item.estimatedImprovement}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <AdminPanel title="No critical gaps" className="mb-10">
              <p className="text-sm text-fog">
                Decision-critical sources look healthy — or Missing Intel could not load. Re-run if this seems wrong.
              </p>
              <div className="mt-4">
                <WorkspaceButton variant="secondary" onClick={() => void load()}>
                  Refresh
                </WorkspaceButton>
              </div>
            </AdminPanel>
          )}

          {!missing?.payments.hasPayments && (
            <div className="mb-8">
              <MissingMetricCard
                missing={{
                  label: "Payments Verified",
                  reason: "No settled Payment rows — cash stage cannot be verified",
                  required: ["Stripe webhook writing Payment rows", "At least one succeeded payment"],
                  confidence: 0,
                  unlockAfter: "Unlock after Financial Center records a settled payment",
                  owner: METRIC_OWNERS.financial_center,
                  unlockHref: "/admin/financial",
                }}
              />
            </div>
          )}

          {report && (
            <>
              <div className="mb-8 rounded-xl border border-accent/20 bg-accent/5 p-6">
                <p className="text-[0.6rem] uppercase text-muted">Platform readiness</p>
                <p className={cn("font-display text-5xl", scoreColor)}>{report.overallScore}</p>
                <p className="mt-2 text-xs text-fog">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
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
                <AdminPanel title="Engineering issues" className="mb-8">
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
            </>
          )}
        </>
      )}
    </WorkspaceChrome>
  );
}
