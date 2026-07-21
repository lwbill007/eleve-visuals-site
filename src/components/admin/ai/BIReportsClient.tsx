"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIReportResult, AIReportType } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import { WorkspaceChrome, WorkspaceEmpty, WorkspaceError } from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import { ExecutiveReportV2View } from "./ExecutiveReportV2View";

const REPORT_TYPES: { type: AIReportType; label: string }[] = [
  { type: "monthly", label: "Monthly Business Draft" },
  { type: "quarterly", label: "Quarterly Business Draft" },
  { type: "yearly", label: "Yearly Business Draft" },
  { type: "sponsor", label: "Sponsor-Ready Draft" },
  { type: "revenue", label: "Revenue Analysis Draft" },
  { type: "growth", label: "Growth Outlook · AI Prediction" },
  { type: "marketing", label: "Marketing Performance Draft" },
];

export function BIReportsClient() {
  useSetAIPage("reports");
  const [loading, setLoading] = useState<AIReportType | null>(null);
  const [report, setReport] = useState<AIReportResult | null>(null);
  const [error, setError] = useState("");
  const [showNarrative, setShowNarrative] = useState(false);

  async function generate(type: AIReportType) {
    setLoading(type);
    setReport(null);
    setError("");
    setShowNarrative(false);
    try {
      const res = await adminFetch("/api/admin/ai/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport((await res.json()) as AIReportResult);
    } catch {
      setError("Report generation failed. Retry, or open Analytics / Financial Center for measured sources.");
    } finally {
      setLoading(null);
    }
  }

  const reportCapabilities: OsCapability[] = useMemo(() => {
    const analytics = METRIC_OWNERS.analytics;
    const finance = METRIC_OWNERS.financial_center;
    return [
      {
        id: "period",
        label: "Period reports",
        status: "partial",
        summary: "Monthly / quarterly / yearly drafts generate from available studio data; verify before sharing.",
      },
      {
        id: "export",
        label: "One-click export",
        status: "partial",
        summary: "On-screen Report 2.0 is live. Dedicated PDF/CSV export package is partial.",
        missing: {
          label: "Export package",
          reason: "No one-click PDF/CSV export pipeline yet",
          required: ["Export renderer", "Download endpoint"],
          confidence: 0,
          unlockAfter: "Unlock after export pipeline",
          owner: analytics,
          unlockHref: "/admin/qa",
        },
      },
      {
        id: "traffic",
        label: "Traffic figures",
        status: "planned",
        summary: "Traffic numbers must come from Analytics SSoT — never invent in narratives.",
        href: "/admin/analytics",
        missing: {
          label: "Embedded traffic charts",
          reason: "Reports must cite Analytics — not duplicate charts",
          required: ["Cross-check Analytics before sharing"],
          confidence: 0,
          unlockAfter: "Open Analytics for verified traffic",
          owner: analytics,
          unlockHref: "/admin/analytics",
        },
      },
      {
        id: "revenue",
        label: "Revenue figures",
        status: "planned",
        summary: "Settled cash is owned by Financial Center — never invent recoverable $.",
        href: "/admin/financial",
        missing: {
          label: "Verified revenue in reports",
          reason: "Narrative drafts are not ledger-verified",
          required: ["Succeeded Payment rows", "Cross-check Financial Center"],
          confidence: 0,
          unlockAfter: "Cross-check Financial Center before sharing money claims",
          owner: finance,
          unlockHref: "/admin/financial",
        },
      },
    ];
  }, []);

  return (
    <WorkspaceChrome
      eyebrow={osEyebrow("grow", "What should leadership see?")}
      title="Reports"
      description="On-demand report drafts with structured truth labels. Export is not one-click yet; money and traffic claims require source verification."
      extra={<AskAIButton />}
      related={[
        { label: "Analytics", href: "/admin/analytics", desc: "What is traffic doing?" },
        { label: "Website Intelligence", href: "/admin/website", desc: "Is the site healthy?" },
        { label: "Financial Center", href: "/admin/financial", desc: "Where is the money?" },
        { label: "Briefing", href: "/admin/briefing", desc: "Why did it happen?" },
      ]}
    >
      <OsCapabilityGrid
        className="mb-6"
        title="Report honesty"
        subtitle="Never invent recoverable revenue or duplicate Analytics charts in exports."
        capabilities={reportCapabilities}
      />

      <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-fog">
        Structured reports label <span className="text-cream">Measured Data</span>,{" "}
        <span className="text-cream">AI Analysis</span>, and{" "}
        <span className="text-cream">AI Prediction</span>. Narrative drafts are optional and never
        verified financials — cross-check Analytics and{" "}
        <Link href="/admin/financial" className="text-accent hover:underline">
          Financial Center
        </Link>{" "}
        before sharing.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.type}
            type="button"
            disabled={loading !== null}
            onClick={() => generate(r.type)}
            className="rounded-xl border border-stone/25 p-5 text-left transition-colors hover:border-accent/30 disabled:opacity-50"
          >
            <p className="font-display text-lg text-cream">{r.label}</p>
            <p className="mt-1 text-xs text-accent uppercase">
              {loading === r.type ? "Generating…" : "✦ Generate Report 2.0"}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6">
          <WorkspaceError message={error} onRetry={() => setError("")} />
        </div>
      )}

      {!report && !loading && !error && (
        <div className="mt-6">
          <WorkspaceEmpty
            title="No report generated yet"
            detail="Choose a period above. Structured layers are labeled; money claims must cross-check Financial Center."
          />
        </div>
      )}

      {report?.reportV2 && (
        <div className="mt-8">
          <ExecutiveReportV2View report={report.reportV2} />
        </div>
      )}

      {report && (
        <AdminPanel
          title={REPORT_TYPES.find((r) => r.type === report.type)?.label ?? "Report"}
          subtitle={`Provider: ${report.provider} · DRAFT narrative`}
          className="mt-8"
        >
          <button
            type="button"
            onClick={() => setShowNarrative((v) => !v)}
            className="mb-3 text-xs text-accent uppercase hover:underline"
          >
            {showNarrative ? "Hide AI narrative draft" : "Show AI narrative draft"}
          </button>
          {showNarrative && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-dim">
              {report.content}
            </p>
          )}
          {!report.reportV2 && !showNarrative && (
            <p className="text-sm text-muted">
              Structured Report 2.0 unavailable for this run — open the narrative draft or retry.
            </p>
          )}
        </AdminPanel>
      )}

      <AdminPanel title="Website Intelligence" subtitle="Evidence-graded SEO · UX · conversion" className="mt-8">
        <p className="text-sm text-cream-dim">
          Category health, truth-labeled recommendations, and orchestrator audits live in the Website
          Intelligence workspace.
        </p>
        <Link
          href="/admin/website"
          className="mt-4 inline-flex border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
        >
          Open Website Intelligence →
        </Link>
      </AdminPanel>
    </WorkspaceChrome>
  );
}
