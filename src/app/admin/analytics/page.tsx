import { AdminShell } from "@/components/admin/AdminShell";
import { AnalyticsClient } from "@/components/admin/os/AnalyticsClient";

export default function AdminAnalyticsPage() {
  return (
    <AdminShell title="Analytics">
      <AnalyticsClient />
    </AdminShell>
  );
}
