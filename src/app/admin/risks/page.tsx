"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";
import { RiskCard } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import type { ExecutiveIntelligence } from "@/lib/ai/types";

export default function RisksPage() {
  useSetAIPage("risks");
  const [data, setData] = useState<ExecutiveIntelligence | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/ai/executive").then((r) => r.json()).then(setData);
  }, []);

  return (
    <AdminShell title="Risk Center">
      <AdminPageHeader
        eyebrow="Early warning system"
        title="Risk Center"
        description="Continuous monitoring of bookings, engagement, follow-ups, and operations — with evidence for every alert."
      />

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.risks.length === 0 ? (
            <p className="text-fog">No elevated risks detected from current business signals.</p>
          ) : (
            data.risks.map((risk) => <RiskCard key={risk.id} risk={risk} />)
          )}
        </div>
      )}
    </AdminShell>
  );
}
