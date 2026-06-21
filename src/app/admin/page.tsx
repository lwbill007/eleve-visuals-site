import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <AdminShell title="Dashboard">
      <AdminDashboard />
    </AdminShell>
  );
}
