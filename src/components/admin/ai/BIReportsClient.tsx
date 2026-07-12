"use client";

import { useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIReportResult, AIReportType } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import { ExecutiveReportV2View } from "./ExecutiveReportV2View";

const REPORT_TYPES: { type: AIReportType; label: string }[] = [
  { type: "monthly", label: "Monthly Business Report" },
  { type: "quarterly", label: "Quarterly Report" },
  { type: "yearly", label: "Yearly Report" },
  { type: "sponsor", label: "Sponsor Report" },
  { type: "revenue", label: "Revenue Forecast" },
  { type: "growth", label: "Growth Forecast" },
  { type: "marketing", label: "Marketing Report" },
];

export function BIReportsClient() {
  useSetAIPage("reports");
  const [loading, setLoading] = useState<AIReportType | null>(null);
  const [report, setReport] = useState<AIReportResult | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);

  async function generate(type: AIReportType) {
    setLoading(type);
    setReport(null);
    setShowNarrative(false);
    const res = await adminFetch("/api/admin/ai/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = res.ok
      ? ((await res.json()) as AIReportResult)
      : {
          type,
          generatedAt: new Date().toISOString(),
          content: "Report generation failed.",
          provider: "rules",
          data: {},
        };
    setReport(data);
    setLoading(null);
  }

  return (
    <WorkspaceChrome
      eyebrow="Command Center"
      title="AI Business Intelligence"
      description="What: Executive Intelligence Report 2.0 from live studio data. Why: separate measured facts from AI analysis. Next: generate, review evidence, approve before acting."
      extra={<AskAIButton />}
      related={[
        { label: "Analytics", href: "/admin/analytics", desc: "Live metrics" },
        { label: "Website", href: "/admin/website", desc: "SEO · UX intel" },
        { label: "Payments", href: "/admin/payments", desc: "Verified $" },
        { label: "Briefing", href: "/admin/briefing", desc: "Daily brief" },
      ]}
    >
      <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-fog">
        Structured reports label <span className="text-cream">Measured Data</span>,{" "}
        <span className="text-cream">AI Analysis</span>, and{" "}
        <span className="text-cream">AI Prediction</span>. Narrative drafts are optional and never
        verified financials — cross-check Analytics and Payments before sharing.
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
