import { AdminShell } from "@/components/admin/AdminShell";
import { BIReportsClient } from "@/components/admin/ai/BIReportsClient";

export default function AdminReportsPage() {
  return (
    <AdminShell title="Business Intelligence">
      <BIReportsClient />
    </AdminShell>
  );
}
