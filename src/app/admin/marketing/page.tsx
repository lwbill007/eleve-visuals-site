import { AdminShell } from "@/components/admin/AdminShell";
import { MarketingStudioClient } from "@/components/admin/ai/MarketingStudioClient";

export default function AdminMarketingPage() {
  return (
    <AdminShell title="Marketing Studio">
      <MarketingStudioClient />
    </AdminShell>
  );
}
