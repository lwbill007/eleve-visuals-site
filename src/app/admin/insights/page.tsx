import { AdminShell } from "@/components/admin/AdminShell";
import { InsightsClient } from "@/components/admin/os/InsightsClient";

export default function AdminInsightsPage() {
  return (
    <AdminShell title="AI Insights">
      <InsightsClient />
    </AdminShell>
  );
}
