import { AdminShell } from "@/components/admin/AdminShell";
import { CRMClient } from "@/components/admin/os/CRMClient";

export default function AdminCRMPage() {
  return (
    <AdminShell title="CRM">
      <CRMClient />
    </AdminShell>
  );
}
