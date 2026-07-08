import { AdminShell } from "@/components/admin/AdminShell";
import { ExecutiveQADashboard } from "@/components/admin/ai/ExecutiveQADashboard";

export default function ExecutiveQAPage() {
  return (
    <AdminShell title="Missing Intel">
      <ExecutiveQADashboard />
    </AdminShell>
  );
}
