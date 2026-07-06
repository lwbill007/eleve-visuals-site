"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { ExecutiveCommandCenter } from "@/components/admin/ai/ExecutiveCommandCenter";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";
import type { ExecutiveOS } from "@/lib/ai/executive/types";
import { EXECUTIVE_MISSION } from "@/lib/ai/executive/types";

export default function ExecutiveIntelligencePage() {
  useSetAIPage("intelligence");
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

  return (
    <AdminShell title="Executive Intelligence">
      <AdminPageHeader
        eyebrow="ÉLEVÉ Executive Intelligence Platform"
        title="Command Center"
        description="Not a chatbot — a coordinated executive leadership team that grows the business. Every insight drives qualified inquiries, bookings, revenue, and brand value."
        action={
          <button
            type="button"
            onClick={() => load(true)}
            className="rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-accent"
          >
            Refresh all intelligence
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {EXECUTIVE_MISSION.map((m) => (
          <span key={m} className="rounded-full border border-stone/20 px-3 py-1 text-[0.6rem] tracking-[0.08em] text-muted uppercase">
            {m}
          </span>
        ))}
      </div>

      <div className="mb-8">
        <AIDailyBriefingPanel />
      </div>

      {loading && !os ? (
        <p className="text-fog">Loading executive intelligence…</p>
      ) : os ? (
        <ExecutiveCommandCenter os={os} />
      ) : null}
    </AdminShell>
  );
}
