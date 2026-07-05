"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";
import { OpportunityCard, OpportunityRevenueBanner } from "@/components/admin/os/ExecutiveIntelligenceComponents";
import type { ExecutiveIntelligence } from "@/lib/ai/types";

export default function OpportunitiesPage() {
  useSetAIPage("opportunities");
  const [data, setData] = useState<ExecutiveIntelligence | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/ai/executive").then((r) => r.json()).then(setData);
  }, []);

  return (
    <AdminShell title="Opportunity Center">
      <AdminPageHeader
        eyebrow="Opportunity Engine"
        title="Opportunity Center"
        description="Actions ranked by expected revenue, confidence, and urgency — not raw data tables."
      />

      {data && (
        <div className="space-y-6">
          <OpportunityRevenueBanner total={data.totalOpportunityRevenue} count={data.opportunities.length} />
          <div className="grid gap-4 lg:grid-cols-2">
            {data.opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
