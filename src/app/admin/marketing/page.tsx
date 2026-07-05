import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MarketingStudioClient } from "@/components/admin/ai/MarketingStudioClient";

export default function AdminMarketingPage() {
  return (
    <AdminShell title="Marketing Studio">
      <Suspense fallback={<p className="text-fog">Loading marketing studio…</p>}>
        <MarketingStudioClient />
      </Suspense>
    </AdminShell>
  );
}
