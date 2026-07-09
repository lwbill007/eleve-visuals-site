"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useBriefingOptional } from "@/components/admin/ai/BriefingProvider";
import {
  WorkspaceAIStrip,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLoading,
  WorkspaceRelated,
} from "@/components/admin/os/WorkspaceFrame";

export default function BriefingPage() {
  useSetAIPage("dashboard");
  const ctx = useBriefingOptional();
  const loading = ctx?.loading ?? true;
  const briefing = ctx?.briefing;
  const refresh = ctx?.refresh;

  return (
    <AdminShell title="AI Briefing">
      <WorkspaceHeader
        eyebrow="Command"
        title="AI Briefing"
        description="What happened overnight, why it matters, and what to do next — regenerated from live Business Brain data."
        onRefresh={refresh ? () => void refresh() : undefined}
        refreshing={loading && Boolean(briefing)}
      />
      <WorkspaceAIStrip />

      {loading && !briefing ? (
        <WorkspaceLoading rows={5} />
      ) : !briefing ? (
        <WorkspaceError
          message="Briefing unavailable — check AI provider / database connectivity."
          onRetry={refresh ? () => void refresh() : undefined}
        />
      ) : (
        <div className="space-y-6">
          <AIDailyBriefingPanel />
          {!(briefing.recommendedActions?.length > 0) && (
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
            <Link href="/admin/memory" className="text-accent hover:underline">
              Business Brain →
            </Link>
          </div>
        </div>
      )}

      <WorkspaceRelated
        links={[
          { label: "Home", href: "/admin", desc: "Command Center" },
          { label: "Opportunities", href: "/admin/opportunities", desc: "Execute queue" },
          { label: "Risks", href: "/admin/risks", desc: "Attention" },
          { label: "Timeline", href: "/admin/timeline", desc: "Events" },
        ]}
      />
    </AdminShell>
  );
}
