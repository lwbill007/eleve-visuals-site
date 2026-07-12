"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

export default function BriefingPage() {
  useSetAIPage("dashboard");
  const ctx = useBriefingOptional();
  const loading = ctx?.loading ?? true;
  const briefing = ctx?.briefing;
  const refresh = ctx?.refresh;
  const error = ctx?.error;

  return (
    <AdminShell title="AI Briefing">
      <WorkspaceChrome
        eyebrow="Command · Briefing"
        title="AI Briefing"
        description="Evidence-graded CEO briefing — Measured Data vs AI Analysis vs Predictions, with recommendations that never auto-execute."
        onRefresh={refresh ? () => void refresh() : undefined}
        refreshing={loading && Boolean(briefing)}
        related={[
          { label: "Home", href: "/admin", desc: "Command Center" },
          { label: "Opportunities", href: "/admin/opportunities", desc: "Execute queue" },
          { label: "Risks", href: "/admin/risks", desc: "Attention" },
          { label: "Reports", href: "/admin/reports", desc: "BI Report 2.0" },
        ]}
      >
        {loading && !briefing ? (
          <WorkspaceLoading rows={5} />
        ) : !briefing ? (
          <WorkspaceError
            message={error || "Briefing unavailable — check AI provider / database connectivity."}
            onRetry={refresh ? () => void refresh() : undefined}
          />
        ) : (
          <div className="space-y-6">
            <AIDailyBriefingPanel />
            {!briefing.reportV2 && !(briefing.recommendedActions?.length > 0) && (
              <WorkspaceEmpty
                title="No action list in this brief"
                detail="Open Opportunities for the ranked execute queue."
                actionHref="/admin/opportunities"
                actionLabel="Opportunities"
              />
            )}
            <div className="flex flex-wrap gap-3 text-xs">
              <Link href="/admin/opportunities" className="text-accent hover:underline">
                Opportunities →
              </Link>
              <Link href="/admin/leaks" className="text-accent hover:underline">
                Revenue leaks →
              </Link>
              <Link href="/admin/website" className="text-accent hover:underline">
                Website Intelligence →
              </Link>
              <Link href="/admin/memory" className="text-accent hover:underline">
                Business Brain →
              </Link>
            </div>
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
