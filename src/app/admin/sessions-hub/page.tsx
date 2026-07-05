import { AdminShell } from "@/components/admin/AdminShell";
import { SessionsHubClient } from "@/components/admin/os/SessionsHubClient";

export default function AdminSessionsHubPage() {
  return (
    <AdminShell title="Sessions Hub">
      <SessionsHubClient />
    </AdminShell>
  );
}
