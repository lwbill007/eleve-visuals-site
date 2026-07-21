import { AdminShell } from "@/components/admin/AdminShell";
import { AutomationsClient } from "@/components/admin/ai/AutomationsClient";

export default function AdminAutomationsPage() {
  return (
    <AdminShell title="Automation Center">
      <AutomationsClient />
    </AdminShell>
  );
}
