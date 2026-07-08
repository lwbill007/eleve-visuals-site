"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { ExecutiveCommandCenter } from "@/components/admin/ai/ExecutiveCommandCenter";
import { TruthMetricCard } from "@/components/admin/ai/TruthMetricCard";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";
import type { ExecutiveOS } from "@/lib/ai/executive/types";
import { EXECUTIVE_MISSION } from "@/lib/ai/executive/types";

export default function ExecutiveIntelligencePage() {
  useSetAIPage("intelligence");
  const { context: execContext } = useExecutiveContext();
  const [os, setOs] = useState<ExecutiveOS | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (refresh = false) => {
    setLoading(true);
    adminFetch(`/api/admin/ai/executive-os${refresh ? "?refresh=1" : ""}`)
      .then((r) => r.json())
      .then(setOs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const tm = execContext?.truth.metrics;
  const degradedSources = execContext?.connectors.degradedLabels ?? [];

  return (
    <AdminShell title="Mission Control">
      <AdminPageHeader
        eyebrow="Deep briefing"
        title="Mission Control"
        description="Full executive briefing when you need depth. Day-to-day decisions live on Home and Opportunities."
        action={
          <button
            type="button"
            onClick={() => load(true)}
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-accent"
          >
            Refresh intelligence
          </button>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {EXECUTIVE_MISSION.map((m) => (
          <span key={m} className="rounded-full border border-stone/20 px-3 py-1 text-[0.6rem] tracking-[0.08em] text-muted uppercase">
            {m}
          </span>
        ))}
      </div>

      {tm ? (
        <div className="mb-8">
          <p className="mb-3 text-[0.65rem] tracking-[0.16em] text-muted uppercase">
            Truth Layer — canonical metrics (click any value for provenance)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TruthMetricCard metric={tm["revenue.mtd"]} currency href="/admin/analytics" />
            <TruthMetricCard metric={tm["revenue.pipeline"]} currency href="/admin/pipeline" />
            <TruthMetricCard metric={tm["bookings.total"]} href="/admin/submissions?type=booking" />
            <TruthMetricCard metric={tm["conversion.rate"]} href="/admin/analytics" />
            <TruthMetricCard metric={tm["traffic.30d"]} href="/admin/analytics" />
            <TruthMetricCard metric={tm["knowledge.verifiedPct"]} href="/admin/memory" />
            <TruthMetricCard metric={tm["attention.staleInquiries"]} href="/admin/pipeline" />
            <TruthMetricCard metric={tm["attention.followUpValue"]} currency href="/admin/crm" />
          </div>
          {degradedSources.length > 0 && (
            <p className="mt-3 text-xs text-amber-300/80">
              Degraded sources: {degradedSources.join(", ")} — affected metrics labeled Estimated.
            </p>
          )}
        </div>
      ) : null}

      {loading && !os ? (
        <p className="text-fog">Loading executive operating system…</p>
      ) : os ? (
        <ExecutiveCommandCenter os={os} onRefresh={() => load(true)} />
      ) : null}
    </AdminShell>
  );
}
